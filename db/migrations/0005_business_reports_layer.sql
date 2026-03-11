-- Business-facing report layer: state snapshots + read views

CREATE TABLE IF NOT EXISTS stats.state_daily_snapshots (
  snapshot_date DATE NOT NULL,
  organization_id UUID NOT NULL,
  accounts_without_ls_count BIGINT NOT NULL DEFAULT 0,
  ls_without_accounts_count BIGINT NOT NULL DEFAULT 0,
  inactive_accounts_6m_count BIGINT NOT NULL DEFAULT 0,
  total_accounts_count BIGINT NOT NULL DEFAULT 0,
  total_ls_count BIGINT NOT NULL DEFAULT 0,
  linked_ls_count BIGINT NOT NULL DEFAULT 0,
  conversion_percent NUMERIC(7,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, organization_id)
);

CREATE INDEX IF NOT EXISTS ix_state_daily_snapshots_org_date
  ON stats.state_daily_snapshots (organization_id, snapshot_date);

CREATE OR REPLACE FUNCTION stats.upsert_state_daily_snapshot(
  p_snapshot_date DATE,
  p_organization_id UUID,
  p_accounts_without_ls_count BIGINT,
  p_ls_without_accounts_count BIGINT,
  p_inactive_accounts_6m_count BIGINT,
  p_total_accounts_count BIGINT,
  p_total_ls_count BIGINT,
  p_linked_ls_count BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversion_percent NUMERIC(7,2) := 0;
BEGIN
  IF p_total_accounts_count > 0 THEN
    v_conversion_percent := ROUND((p_linked_ls_count::NUMERIC / p_total_accounts_count::NUMERIC) * 100, 2);
  END IF;

  INSERT INTO stats.state_daily_snapshots (
    snapshot_date,
    organization_id,
    accounts_without_ls_count,
    ls_without_accounts_count,
    inactive_accounts_6m_count,
    total_accounts_count,
    total_ls_count,
    linked_ls_count,
    conversion_percent,
    updated_at
  )
  VALUES (
    p_snapshot_date,
    p_organization_id,
    GREATEST(p_accounts_without_ls_count, 0),
    GREATEST(p_ls_without_accounts_count, 0),
    GREATEST(p_inactive_accounts_6m_count, 0),
    GREATEST(p_total_accounts_count, 0),
    GREATEST(p_total_ls_count, 0),
    GREATEST(p_linked_ls_count, 0),
    GREATEST(v_conversion_percent, 0),
    NOW()
  )
  ON CONFLICT (snapshot_date, organization_id)
  DO UPDATE SET
    accounts_without_ls_count = EXCLUDED.accounts_without_ls_count,
    ls_without_accounts_count = EXCLUDED.ls_without_accounts_count,
    inactive_accounts_6m_count = EXCLUDED.inactive_accounts_6m_count,
    total_accounts_count = EXCLUDED.total_accounts_count,
    total_ls_count = EXCLUDED.total_ls_count,
    linked_ls_count = EXCLUDED.linked_ls_count,
    conversion_percent = EXCLUDED.conversion_percent,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE VIEW stats.vw_monthly_org_logins_channels AS
SELECT
  m.metric_month,
  m.organization_id,
  m.platform,
  SUM(m.total_count)::BIGINT AS total_logins,
  SUM(m.unique_users_count)::BIGINT AS unique_users
FROM stats.agg_monthly_metrics m
WHERE m.event_type = 'login'
  AND m.platform IN ('web', 'mobile')
GROUP BY m.metric_month, m.organization_id, m.platform;

CREATE OR REPLACE VIEW stats.vw_monthly_auth_method_stats AS
SELECT
  m.metric_month,
  m.organization_id,
  m.auth_method,
  SUM(m.total_count)::BIGINT AS total_logins,
  SUM(m.unique_users_count)::BIGINT AS unique_users
FROM stats.agg_monthly_metrics m
WHERE m.event_type = 'login'
GROUP BY m.metric_month, m.organization_id, m.auth_method;

CREATE OR REPLACE VIEW stats.vw_monthly_payment_type_stats AS
SELECT
  m.metric_month,
  m.organization_id,
  COALESCE(NULLIF(m.payment_type, ''), 'unknown') AS payment_type,
  SUM(m.total_count)::BIGINT AS total_payments,
  SUM(m.unique_users_count)::BIGINT AS unique_payers
FROM stats.agg_monthly_metrics m
WHERE m.event_type = 'payment_success'
GROUP BY m.metric_month, m.organization_id, COALESCE(NULLIF(m.payment_type, ''), 'unknown');

CREATE OR REPLACE VIEW stats.vw_monthly_request_type_stats AS
SELECT
  m.metric_month,
  m.organization_id,
  m.event_type,
  COALESCE(NULLIF(m.request_type, ''), 'unknown') AS request_type,
  SUM(m.total_count)::BIGINT AS total_requests,
  SUM(m.unique_users_count)::BIGINT AS unique_users
FROM stats.agg_monthly_metrics m
WHERE m.event_type IN ('request_created', 'provider_request_sent')
GROUP BY
  m.metric_month,
  m.organization_id,
  m.event_type,
  COALESCE(NULLIF(m.request_type, ''), 'unknown');

CREATE OR REPLACE VIEW stats.vw_state_metrics_latest AS
SELECT DISTINCT ON (s.organization_id)
  s.organization_id,
  s.snapshot_date,
  s.accounts_without_ls_count,
  s.ls_without_accounts_count,
  s.inactive_accounts_6m_count,
  s.total_accounts_count,
  s.total_ls_count,
  s.linked_ls_count,
  s.conversion_percent
FROM stats.state_daily_snapshots s
ORDER BY s.organization_id, s.snapshot_date DESC;
