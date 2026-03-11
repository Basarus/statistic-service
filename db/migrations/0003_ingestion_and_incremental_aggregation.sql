-- Ingestion API helpers + incremental aggregation primitives

CREATE OR REPLACE FUNCTION stats.ingest_event(
  p_event_uuid UUID,
  p_event_type TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_organization_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_ls_id UUID DEFAULT NULL,
  p_platform stats.platform_type DEFAULT 'unknown',
  p_auth_method stats.auth_method_type DEFAULT 'unknown',
  p_request_type TEXT DEFAULT NULL,
  p_payment_type TEXT DEFAULT NULL,
  p_is_success BOOLEAN DEFAULT TRUE,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(inserted BOOLEAN, event_id BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM stats.event_types et
    WHERE et.code = p_event_type
      AND et.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Unknown or disabled event_type: %', p_event_type;
  END IF;

  INSERT INTO stats.events_raw (
    event_uuid,
    event_type,
    occurred_at,
    organization_id,
    user_id,
    account_id,
    ls_id,
    platform,
    auth_method,
    request_type,
    payment_type,
    is_success,
    payload
  )
  VALUES (
    p_event_uuid,
    p_event_type,
    p_occurred_at,
    p_organization_id,
    p_user_id,
    p_account_id,
    p_ls_id,
    p_platform,
    p_auth_method,
    p_request_type,
    p_payment_type,
    COALESCE(p_is_success, TRUE),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (event_uuid) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT e.id
      INTO v_event_id
    FROM stats.events_raw e
    WHERE e.event_uuid = p_event_uuid;

    RETURN QUERY SELECT FALSE AS inserted, v_event_id AS event_id;
  ELSE
    RETURN QUERY SELECT TRUE AS inserted, v_event_id AS event_id;
  END IF;
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
      c.organization_id,
      c.platform,
      c.auth_method,
      c.request_type,
      c.payment_type,
      COUNT(*)::BIGINT AS total_count,
      COUNT(DISTINCT c.user_id)::BIGINT AS unique_users_count,
      COUNT(DISTINCT c.account_id)::BIGINT AS unique_accounts_count
    FROM chunk c
    GROUP BY
      DATE(c.occurred_at),
      c.event_type,
      c.organization_id,
      c.platform,
      c.auth_method,
      c.request_type,
      c.payment_type
  ), upserted AS (
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
      -- unique values in incremental mode are approximate; exactness comes from nightly recompute
      unique_users_count = GREATEST(stats.agg_daily_metrics.unique_users_count, EXCLUDED.unique_users_count),
      unique_accounts_count = GREATEST(stats.agg_daily_metrics.unique_accounts_count, EXCLUDED.unique_accounts_count),
      updated_at = NOW()
    RETURNING 1
  )
  SELECT COALESCE(MAX(c.id), v_last_event_id), COUNT(*)::BIGINT
    INTO v_max_event_id, v_processed
  FROM chunk c;

  UPDATE stats.aggregation_state
  SET
    last_event_id = v_max_event_id,
    last_processed_at = NOW(),
    updated_at = NOW()
  WHERE job_name = p_job_name;

  RETURN QUERY SELECT v_processed AS processed_rows, v_max_event_id AS new_last_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION stats.rollup_monthly_from_daily(
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
    DATE_TRUNC('month', d.metric_date)::DATE AS metric_month,
    d.event_type,
    d.organization_id,
    d.platform,
    d.auth_method,
    d.request_type,
    d.payment_type,
    SUM(d.total_count)::BIGINT AS total_count,
    MAX(d.unique_users_count)::BIGINT AS unique_users_count,
    MAX(d.unique_accounts_count)::BIGINT AS unique_accounts_count,
    NOW()
  FROM stats.agg_daily_metrics d
  WHERE DATE_TRUNC('month', d.metric_date)::DATE BETWEEN v_month_from AND v_month_to
  GROUP BY
    DATE_TRUNC('month', d.metric_date)::DATE,
    d.event_type,
    d.organization_id,
    d.platform,
    d.auth_method,
    d.request_type,
    d.payment_type;
END;
$$;

CREATE OR REPLACE VIEW stats.vw_current_month_org_channel_logins AS
SELECT
  d.organization_id,
  d.platform,
  SUM(d.total_count)::BIGINT AS total_logins,
  SUM(d.unique_users_count)::BIGINT AS unique_users
FROM stats.agg_daily_metrics d
WHERE d.event_type = 'login'
  AND d.metric_date >= DATE_TRUNC('month', NOW())::DATE
  AND d.metric_date < (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::DATE
GROUP BY d.organization_id, d.platform;
