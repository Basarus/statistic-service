# Aggregation runbook (MVP)

Этот документ описывает, как вызывать SQL-функции из scheduler слоя NestJS.

## 1) Ingestion

Для приема одного события используйте:

```sql
SELECT *
FROM stats.ingest_event(
  p_event_uuid      => $1,
  p_event_type      => $2,
  p_occurred_at     => $3,
  p_organization_id => $4,
  p_user_id         => $5,
  p_account_id      => $6,
  p_ls_id           => $7,
  p_platform        => $8,
  p_auth_method     => $9,
  p_request_type    => $10,
  p_payment_type    => $11,
  p_is_success      => $12,
  p_payload         => $13
);
```

Функция:
- валидирует `event_type` по `stats.event_types`;
- гарантирует идемпотентность по `event_uuid`;
- возвращает `inserted = true/false`.

## 2) Incremental daily aggregation (каждые 15 минут)

```sql
SELECT *
FROM stats.aggregate_events_incremental(
  p_job_name => 'aggregate-events-incremental',
  p_chunk_size => 50000
);
```

Принцип:
- читает `last_event_id` из `stats.aggregation_state`;
- обрабатывает следующий chunk raw-событий;
- upsert в `stats.agg_daily_metrics`;
- сохраняет новый `last_event_id`.

> Важно: `unique_*` в incremental режиме аппроксимируются; точность восстанавливается nightly-reconcile.

## 3) Nightly reconcile (за последние 2-3 дня)

```sql
SELECT stats.recompute_daily_metrics(current_date - 3, current_date);
SELECT stats.recompute_monthly_metrics_from_raw(date_trunc('month', current_date)::date, current_date);
```

Это закрывает кейсы поздних/повторно доставленных событий.

## 4) Monthly rollup from daily (каждый час)

```sql
SELECT stats.rollup_monthly_from_daily(
  date_trunc('month', current_date)::date,
  current_date
);
```

Подходит для оперативных графиков, когда не нужен точный distinct на месяц в реальном времени.

## 5) Cleanup raw (раз в сутки)

```sql
SELECT stats.cleanup_raw_events(90);
```

Рекомендуется запускать cleanup только после завершения nightly job.

## 6) Готовый view для быстрого чтения

```sql
SELECT *
FROM stats.vw_current_month_org_channel_logins
WHERE organization_id = $1;
```


## 7) Нормализация nullable измерений

Чтобы `UPSERT` в агрегаты был детерминированным, nullable измерения нормализуются:

- `organization_id` -> `00000000-0000-0000-0000-000000000000`
- `request_type` -> `''`
- `payment_type` -> `''`

Это выполняется внутри SQL-функций агрегации, поэтому scheduler не должен делать дополнительную нормализацию.
