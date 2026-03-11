-- Consistency fixes:
-- 1) make incremental chunk processing atomic for state cursor update
-- 2) avoid overwriting exact monthly metrics with approximate rollup in pipeline tick
-- 3) add status check constraint for job_runs rows

ALTER TABLE stats.job_runs
  ADD CONSTRAINT chk_job_runs_status
  CHECK (status IN ('started', 'success', 'failed'));

CREATE OR REPLACE FUNCTION stats.aggregate_events_incremental(
  p_job_name TEXT DEFAULT 'aggregate-events-incremental',
  p_chunk_size INTEGER DEFAULT 50000
)
RETURNS TABLE(processed_rows BIGINT, new_last_event_id BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_event_id BIGINT := 0;
  v_max_event_id BIGINT := 0;
  v_processed BIGINT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('stats.aggregate_events_incremental'));

  INSERT INTO stats.aggregation_state (job_name, last_processed_at, last_event_id, updated_at)
  VALUES (p_job_name, NULL, 0, NOW())
  ON CONFLICT (job_name) DO NOTHING;

  SELECT COALESCE(s.last_event_id, 0)
    INTO v_last_event_id
  FROM stats.aggregation_state s
  WHERE s.job_name = p_job_name
  FOR UPDATE;

  WITH chunk AS (
    SELECT e.*
    FROM stats.events_raw e
    WHERE e.id > v_last_event_id
      AND e.is_success = TRUE
    ORDER BY e.id
    LIMIT p_chunk_size
  ),
  grouped AS (
    SELECT
      DATE(c.occurred_at) AS metric_date,
      c.event_type,
      COALESCE(c.organization_id, '00000000-0000-0000-0000-000000000000'::uuid) AS organization_id,
      c.platform,
      c.auth_method,
      COALESCE(c.request_type, '') AS request_type,
      COALESCE(c.payment_type, '') AS payment_type,
      COUNT(*)::BIGINT AS total_count,
      COUNT(DISTINCT c.user_id)::BIGINT AS unique_users_count,
      COUNT(DISTINCT c.account_id)::BIGINT AS unique_accounts_count
    FROM chunk c
    GROUP BY
      DATE(c.occurred_at),
      c.event_type,
      COALESCE(c.organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
      c.platform,
      c.auth_method,
      COALESCE(c.request_type, ''),
      COALESCE(c.payment_type, '')
  ),
  upserted AS (
    INSERT INTO stats.agg_daily_metrics (
      metric_date,
      event_type,
      organization_id,
      platform,
      auth_method,
      request_type,
      payment_type,
      total_count,
      unique_users_count,
      unique_accounts_count,
      updated_at
    )
    SELECT
      g.metric_date,
      g.event_type,
      g.organization_id,
      g.platform,
      g.auth_method,
      g.request_type,
      g.payment_type,
      g.total_count,
      g.unique_users_count,
      g.unique_accounts_count,
      NOW()
    FROM grouped g
    ON CONFLICT (
      metric_date,
      event_type,
      organization_id,
      platform,
      auth_method,
      request_type,
      payment_type
    )
    DO UPDATE SET
      total_count = stats.agg_daily_metrics.total_count + EXCLUDED.total_count,
      unique_users_count = GREATEST(stats.agg_daily_metrics.unique_users_count, EXCLUDED.unique_users_count),
      unique_accounts_count = GREATEST(stats.agg_daily_metrics.unique_accounts_count, EXCLUDED.unique_accounts_count),
      updated_at = NOW()
    RETURNING 1
  ),
  chunk_stats AS (
    SELECT
      COALESCE(MAX(c.id), v_last_event_id) AS max_event_id,
      COUNT(*)::BIGINT AS processed_count
    FROM chunk c
  )
  SELECT cs.max_event_id, cs.processed_count
    INTO v_max_event_id, v_processed
  FROM chunk_stats cs;

  UPDATE stats.aggregation_state
  SET
    last_event_id = v_max_event_id,
    last_processed_at = NOW(),
    updated_at = NOW()
  WHERE job_name = p_job_name;

  RETURN QUERY SELECT v_processed AS processed_rows, v_max_event_id AS new_last_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION stats.run_pipeline_tick(
  p_incremental_chunk_size INTEGER DEFAULT 50000,
  p_reconcile_lookback_days INTEGER DEFAULT 3,
  p_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE(
  incremental_processed BIGINT,
  incremental_last_event_id BIGINT,
  cleaned_raw_rows BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id BIGINT;
  v_processed BIGINT := 0;
  v_last_event_id BIGINT := 0;
  v_cleaned BIGINT := 0;
  v_reconcile_from DATE;
  v_reconcile_to DATE;
BEGIN
  INSERT INTO stats.job_runs (job_name, status, details)
  VALUES (
    'pipeline-tick',
    'started',
    jsonb_build_object(
      'incremental_chunk_size', p_incremental_chunk_size,
      'reconcile_lookback_days', p_reconcile_lookback_days,
      'retention_days', p_retention_days
    )
  )
  RETURNING id INTO v_run_id;

  BEGIN
    SELECT t.processed_rows, t.new_last_event_id
      INTO v_processed, v_last_event_id
    FROM stats.aggregate_events_incremental(
      p_job_name => 'aggregate-events-incremental',
      p_chunk_size => p_incremental_chunk_size
    ) t;

    v_reconcile_from := CURRENT_DATE - GREATEST(p_reconcile_lookback_days, 0);
    v_reconcile_to := CURRENT_DATE;

    PERFORM stats.recompute_daily_metrics(v_reconcile_from, v_reconcile_to);

    -- Keep monthly as exact (from raw) in orchestrated run.
    -- rollup_monthly_from_daily remains available for fast ad-hoc refresh scenarios,
    -- but is intentionally not executed here to avoid overwriting exact distinct values.
    PERFORM stats.recompute_monthly_metrics_from_raw(
      DATE_TRUNC('month', v_reconcile_from)::DATE,
      v_reconcile_to
    );

    SELECT stats.cleanup_raw_events(GREATEST(p_retention_days, 1))
      INTO v_cleaned;

    UPDATE stats.job_runs
    SET
      status = 'success',
      finished_at = NOW(),
      processed_rows = COALESCE(v_processed, 0),
      details = details || jsonb_build_object(
        'last_event_id', COALESCE(v_last_event_id, 0),
        'cleanup_deleted_rows', COALESCE(v_cleaned, 0),
        'reconcile_from', v_reconcile_from,
        'reconcile_to', v_reconcile_to,
        'monthly_mode', 'exact_from_raw'
      )
    WHERE id = v_run_id;

    RETURN QUERY
    SELECT
      COALESCE(v_processed, 0),
      COALESCE(v_last_event_id, 0),
      COALESCE(v_cleaned, 0);
  EXCEPTION WHEN OTHERS THEN
    UPDATE stats.job_runs
    SET
      status = 'failed',
      finished_at = NOW(),
      processed_rows = COALESCE(v_processed, 0),
      details = details || jsonb_build_object(
        'error', SQLERRM,
        'last_event_id', COALESCE(v_last_event_id, 0),
        'cleanup_deleted_rows', COALESCE(v_cleaned, 0)
      )
    WHERE id = v_run_id;

    RAISE;
  END;
END;
$$;
