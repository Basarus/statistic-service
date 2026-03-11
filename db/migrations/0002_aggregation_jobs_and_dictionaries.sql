-- Aggregation helpers, dictionaries and runtime settings for MVP

CREATE TABLE IF NOT EXISTS stats.event_types (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO stats.event_types (code, description)
VALUES
  ('login', 'Вход в ЛКА'),
  ('payment_success', 'Успешная оплата'),
  ('meter_reading_submitted', 'Передача показаний'),
  ('receipt_downloaded', 'Скачивание квитанции'),
  ('request_created', 'Создание заявки в ЛКА'),
  ('provider_request_sent', 'Отправка заявки поставщику'),
  ('account_registered', 'Регистрация учетной записи'),
  ('ls_linked', 'Привязка лицевого счета')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS stats.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO stats.admin_settings (key, value)
VALUES
  ('aggregation.interval', '{"cron":"*/15 * * * *"}'::jsonb),
  ('reconcile.lookbackDays', '{"value":3}'::jsonb),
  ('raw.retentionDays', '{"value":90}'::jsonb),
  ('snapshot.enabledReports', '{"reports":["accounts_without_ls","ls_without_accounts","inactive_accounts_6m","conversion"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

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
    e.organization_id,
    e.platform,
    e.auth_method,
    e.request_type,
    e.payment_type,
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
    e.organization_id,
    e.platform,
    e.auth_method,
    e.request_type,
    e.payment_type;
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
    e.organization_id,
    e.platform,
    e.auth_method,
    e.request_type,
    e.payment_type,
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
    e.organization_id,
    e.platform,
    e.auth_method,
    e.request_type,
    e.payment_type;
END;
$$;

CREATE OR REPLACE FUNCTION stats.cleanup_raw_events(
  p_retention_days INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM stats.events_raw
  WHERE occurred_at < NOW() - MAKE_INTERVAL(days => p_retention_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
