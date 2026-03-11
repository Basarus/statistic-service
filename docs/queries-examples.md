# Примеры SQL для бизнес-метрик (MVP)

Ниже примеры запросов, которые можно положить в `report`-слой сервиса.

## 1) Сколько пользователей организации вошли в текущем месяце через web/mobile

```sql
SELECT
  organization_id,
  platform,
  SUM(total_count) AS logins_total,
  SUM(unique_users_count) AS unique_users
FROM stats.agg_daily_metrics
WHERE event_type = 'login'
  AND metric_date >= date_trunc('month', now())::date
  AND metric_date < (date_trunc('month', now()) + interval '1 month')::date
  AND organization_id = $1
  AND platform IN ('web', 'mobile')
GROUP BY organization_id, platform;
```

## 2) Сколько уникальных пользователей вошли в текущем месяце (web + mobile)

```sql
SELECT
  organization_id,
  unique_users_count
FROM stats.agg_monthly_metrics
WHERE event_type = 'login'
  AND metric_month = date_trunc('month', now())::date
  AND organization_id = $1
  AND platform IN ('web', 'mobile');
```

## 3) Сколько пользователей вошли по способам авторизации

```sql
SELECT
  auth_method,
  SUM(total_count) AS total_logins,
  SUM(unique_users_count) AS unique_users
FROM stats.agg_daily_metrics
WHERE event_type = 'login'
  AND metric_date >= date_trunc('month', now())::date
  AND metric_date < (date_trunc('month', now()) + interval '1 month')::date
GROUP BY auth_method
ORDER BY total_logins DESC;
```

## 4) Оплаты/показания/скачивания квитанций по организации за текущий месяц

```sql
SELECT
  event_type,
  SUM(total_count) AS total_actions,
  SUM(unique_users_count) AS unique_users
FROM stats.agg_daily_metrics
WHERE event_type IN ('payment_success', 'meter_reading_submitted', 'receipt_downloaded')
  AND metric_date >= date_trunc('month', now())::date
  AND metric_date < (date_trunc('month', now()) + interval '1 month')::date
  AND organization_id = $1
GROUP BY event_type;
```

## 5) Заявки по типу в ЛКА/поставщику

```sql
SELECT
  event_type,
  request_type,
  SUM(total_count) AS total_requests,
  SUM(unique_users_count) AS unique_users
FROM stats.agg_daily_metrics
WHERE event_type IN ('request_created', 'provider_request_sent')
  AND metric_date >= date_trunc('month', now())::date
  AND metric_date < (date_trunc('month', now()) + interval '1 month')::date
  AND organization_id = $1
GROUP BY event_type, request_type;
```

## Примечание по monthly unique

Для `agg_monthly_metrics.unique_users_count` в MVP используется точный пересчет из `events_raw` (функция `stats.recompute_monthly_metrics_from_raw`), поэтому эту джобу нужно запускать до удаления raw за соответствующие периоды.
