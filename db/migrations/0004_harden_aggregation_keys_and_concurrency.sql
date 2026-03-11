-- Fix nullable dimensions in aggregate keys + add concurrency protection for incremental job

ALTER TABLE stats.agg_daily_metrics
  ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN request_type SET DEFAULT '',
  ALTER COLUMN request_type SET NOT NULL,
  ALTER COLUMN payment_type SET DEFAULT '',
  ALTER COLUMN payment_type SET NOT NULL;

UPDATE stats.agg_daily_metrics
SET
  organization_id = COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  request_type = COALESCE(request_type, ''),
  payment_type = COALESCE(payment_type, '');

ALTER TABLE stats.agg_monthly_metrics
  ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN request_type SET DEFAULT '',
  ALTER COLUMN request_type SET NOT NULL,
  ALTER COLUMN payment_type SET DEFAULT '',
  ALTER COLUMN payment_type SET NOT NULL;

UPDATE stats.agg_monthly_metrics
SET
  organization_id = COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
  request_type = COALESCE(request_type, ''),
  payment_type = COALESCE(payment_type, '');

CREATE OR REPLACE FUNCTION stats.recompute_daily_metrics(
  p_date_from DATE,
  p_date_to DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM stats.agg_daily_metrics
  WHERE metric_date BETWEEN p_date_from AND p_date_to;

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
    DATE(e.occurred_at) AS metric_date,
    e.event_type,
    COALESCE(e.organization_id, '00000000-0000-0000-0000-000000000000'::uuid) AS organization_id,
    e.platform,
    e.auth_method,
    COALESCE(e.request_type, '') AS request_type,
    COALESCE(e.payment_type, '') AS payment_type,
    COUNT(*)::BIGINT AS total_count,
    COUNT(DISTINCT e.user_id)::BIGINT AS unique_users_count,
    COUNT(DISTINCT e.account_id)::BIGINT AS unique_accounts_count,
    NOW() AS updated_at
  FROM stats.events_raw e
  WHERE DATE(e.occurred_at) BETWEEN p_date_from AND p_date_to
    AND e.is_success = TRUE
  GROUP BY
    DATE(e.occurred_at),
    e.event_type,
    COALESCE(e.organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    e.platform,
    e.auth_method,
    COALESCE(e.request_type, ''),
    COALESCE(e.payment_type, '');
END;
$$;

CREATE OR REPLACE FUNCTION stats.recompute_monthly_metrics_from_raw(
  p_month_from DATE,
  p_month_to DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_from DATE := DATE_TRUNC('month', p_month_from)::DATE;
  v_month_to DATE := DATE_TRUNC('month', p_month_to)::DATE;
BEGIN
  DELETE FROM stats.agg_monthly_metrics
  WHERE metric_month BETWEEN v_month_from AND v_month_to;

  INSERT INTO stats.agg_monthly_metrics (
    metric_month,
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
    DATE_TRUNC('month', e.occurred_at)::DATE AS metric_month,
    e.event_type,
    COALESCE(e.organization_id, '00000000-0000-0000-0000-000000000000'::uuid) AS organization_id,
    e.platform,
    e.auth_method,
    COALESCE(e.request_type, '') AS request_type,
    COALESCE(e.payment_type, '') AS payment_type,
    COUNT(*)::BIGINT AS total_count,
    COUNT(DISTINCT e.user_id)::BIGINT AS unique_users_count,
    COUNT(DISTINCT e.account_id)::BIGINT AS unique_accounts_count,
    NOW() AS updated_at
  FROM stats.events_raw e
  WHERE DATE_TRUNC('month', e.occurred_at)::DATE BETWEEN v_month_from AND v_month_to
    AND e.is_success = TRUE
  GROUP BY
    DATE_TRUNC('month', e.occurred_at)::DATE,
    e.event_type,
    COALESCE(e.organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    e.platform,
    e.auth_method,
    COALESCE(e.request_type, ''),
    COALESCE(e.payment_type, '');
END;
$$;

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
  -- prevents concurrent runs of the same aggregation routine
  PERFORM pg_advisory_xact_lock(hashtext('stats.aggregate_events_incremental'));

  INSERT INTO stats.aggregation_state (job_name, last_processed_at, last_event_id, updated_at)
  VALUES (p_job_name, NULL, 0, NOW())
  ON CONFLICT (job_name) DO NOTHING;

  SELECT COALESCE(s.last_event_id, 0)
    INTO v_last_event_id
  FROM stats.aggregation_state s
  WHERE s.job_name = p_job_name;

  WITH chunk AS (
    SELECT e.*
    FROM stats.events_raw e
    WHERE e.id > v_last_event_id
      AND e.is_success = TRUE
    ORDER BY e.id
    LIMIT p_chunk_size
  ), grouped AS (
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
  )
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
    updated_at = NOW();

  SELECT COALESCE(MAX(c.id), v_last_event_id), COUNT(*)::BIGINT
    INTO v_max_event_id, v_processed
  FROM (
    SELECT e.id
    FROM stats.events_raw e
    WHERE e.id > v_last_event_id
      AND e.is_success = TRUE
    ORDER BY e.id
    LIMIT p_chunk_size
  ) c;

  UPDATE stats.aggregation_state
  SET
    last_event_id = v_max_event_id,
    last_processed_at = NOW(),
    updated_at = NOW()
  WHERE job_name = p_job_name;

  RETURN QUERY SELECT v_processed AS processed_rows, v_max_event_id AS new_last_event_id;
END;
$$;
