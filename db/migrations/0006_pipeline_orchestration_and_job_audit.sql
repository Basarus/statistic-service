-- Pipeline orchestration and job audit layer

CREATE TABLE IF NOT EXISTS stats.job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  processed_rows BIGINT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_job_runs_job_started
  ON stats.job_runs (job_name, started_at DESC);

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
    PERFORM stats.recompute_monthly_metrics_from_raw(
      DATE_TRUNC('month', v_reconcile_from)::DATE,
      v_reconcile_to
    );

    PERFORM stats.rollup_monthly_from_daily(
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
        'reconcile_to', v_reconcile_to
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

CREATE OR REPLACE VIEW stats.vw_job_runs_latest AS
SELECT
  jr.id,
  jr.job_name,
  jr.status,
  jr.started_at,
  jr.finished_at,
  jr.processed_rows,
  jr.details
FROM stats.job_runs jr
WHERE jr.id IN (
  SELECT MAX(id)
  FROM stats.job_runs
  GROUP BY job_name
)
ORDER BY jr.started_at DESC;
