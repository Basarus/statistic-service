-- MVP schema for statistics-service

CREATE SCHEMA IF NOT EXISTS stats;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
    CREATE TYPE stats.platform_type AS ENUM ('web', 'mobile', 'api', 'unknown');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_method_type') THEN
    CREATE TYPE stats.auth_method_type AS ENUM ('email', 'phone', 'vk', 'sso', 'unknown');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stats.events_raw (
  id BIGSERIAL PRIMARY KEY,
  event_uuid UUID NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  organization_id UUID,
  user_id UUID,
  account_id UUID,
  ls_id UUID,
  platform stats.platform_type NOT NULL DEFAULT 'unknown',
  auth_method stats.auth_method_type NOT NULL DEFAULT 'unknown',
  request_type TEXT,
  payment_type TEXT,
  is_success BOOLEAN NOT NULL DEFAULT TRUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_events_raw_event_uuid UNIQUE (event_uuid)
);

CREATE INDEX IF NOT EXISTS ix_events_raw_occurred_at ON stats.events_raw (occurred_at);
CREATE INDEX IF NOT EXISTS ix_events_raw_event_type ON stats.events_raw (event_type);
CREATE INDEX IF NOT EXISTS ix_events_raw_org_occurred ON stats.events_raw (organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_events_raw_created_at ON stats.events_raw (created_at);

CREATE TABLE IF NOT EXISTS stats.agg_daily_metrics (
  metric_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  organization_id UUID,
  platform stats.platform_type NOT NULL DEFAULT 'unknown',
  auth_method stats.auth_method_type NOT NULL DEFAULT 'unknown',
  request_type TEXT,
  payment_type TEXT,
  total_count BIGINT NOT NULL DEFAULT 0,
  unique_users_count BIGINT NOT NULL DEFAULT 0,
  unique_accounts_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (
    metric_date,
    event_type,
    organization_id,
    platform,
    auth_method,
    request_type,
    payment_type
  )
);

CREATE INDEX IF NOT EXISTS ix_agg_daily_event_type_date
  ON stats.agg_daily_metrics (event_type, metric_date);

CREATE TABLE IF NOT EXISTS stats.agg_monthly_metrics (
  metric_month DATE NOT NULL,
  event_type TEXT NOT NULL,
  organization_id UUID,
  platform stats.platform_type NOT NULL DEFAULT 'unknown',
  auth_method stats.auth_method_type NOT NULL DEFAULT 'unknown',
  request_type TEXT,
  payment_type TEXT,
  total_count BIGINT NOT NULL DEFAULT 0,
  unique_users_count BIGINT NOT NULL DEFAULT 0,
  unique_accounts_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (
    metric_month,
    event_type,
    organization_id,
    platform,
    auth_method,
    request_type,
    payment_type
  )
);

CREATE INDEX IF NOT EXISTS ix_agg_monthly_event_type_month
  ON stats.agg_monthly_metrics (event_type, metric_month);

CREATE TABLE IF NOT EXISTS stats.aggregation_state (
  job_name TEXT PRIMARY KEY,
  last_processed_at TIMESTAMPTZ,
  last_event_id BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stats.report_snapshots (
  id BIGSERIAL PRIMARY KEY,
  report_type TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_report_snapshots_type_period
  ON stats.report_snapshots (report_type, period_from, period_to);
