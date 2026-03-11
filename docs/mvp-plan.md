# Statistics Service MVP (TypeScript + NestJS + PostgreSQL)

## 1) Цель MVP

Сервис принимает статистические события от внешних систем, хранит `raw`-события с ограниченным сроком жизни, агрегирует их в дневные/месячные витрины и отдает данные для отчетов и виджетов.

## 2) Что входит в MVP

- Отдельный сервис (NestJS).
- Отдельная БД PostgreSQL.
- Две модели данных:
  - `event-based` (события и агрегаты).
  - `state/snapshot-based` (тяжелые или «срезовые» отчеты).
- Планировщик задач (cron jobs) для агрегации, пересчета и очистки raw.

## 3) Таблицы MVP

### `events_raw`

Сырые статистические события (источник истины для пересчета за ограниченный период):

- `event_uuid` — идемпотентность (UNIQUE).
- `event_type` — тип события.
- `occurred_at` — бизнес-время события.
- `organization_id`, `user_id`, `account_id`, `ls_id` — бизнес-ключи.
- `platform` — web/mobile/api.
- `auth_method` — email/phone/vk/... .
- `request_type`, `payment_type` — параметры для аналитики.
- `is_success` — успешность действия.
- `payload jsonb` — расширяемые поля.

### `agg_daily_metrics`

Дневные агрегаты по измерениям:

- `metric_date`, `event_type`, `organization_id`, `platform`, `auth_method`, `request_type`, `payment_type`.
- `total_count`.
- `unique_users_count`.
- `unique_accounts_count`.

### `agg_monthly_metrics`

Месячные агрегаты в аналогичной размерности:

- `metric_month` (первый день месяца).
- Остальные dimension-поля идентичны daily.

### `aggregation_state`

Служебная таблица состояния джоб:

- `job_name`.
- `last_processed_at`.
- `last_event_id`.
- `updated_at`.

### `report_snapshots`

Снапшоты тяжелых отчетов, где нужно очень быстрое чтение:

- `report_type`.
- `period_from`, `period_to`.
- `snapshot_at`.
- `result jsonb`.

## 4) Типы событий для старта

- `login` — вход в ЛКА.
- `payment_success` — успешная оплата.
- `meter_reading_submitted` — передача показаний.
- `receipt_downloaded` — скачивание квитанции.
- `request_created` — заявка создана в ЛКА.
- `provider_request_sent` — заявка отправлена поставщику.
- `account_registered` — регистрация УЗ.
- `ls_linked` — привязка ЛС.

## 5) Cron jobs (MVP)

1. `aggregate-events-incremental` (каждые 15 минут)
   - Берет новые `events_raw` по `aggregation_state`.
   - Обновляет `agg_daily_metrics` через upsert.

2. `rollup-daily-to-monthly` (каждый час)
   - Пересчитывает/досчитывает `agg_monthly_metrics` из daily.

3. `nightly-reconcile` (каждую ночь)
   - Полный пересчет daily за последние 2-3 дня.
   - Нужен для поздних событий.

4. `cleanup-raw-events` (раз в сутки)
   - Удаляет `events_raw` старше retention (по умолчанию 90 дней).

5. `snapshot-reports` (по расписанию)
   - Считает тяжелые state-based отчеты.
   - Обновляет `report_snapshots`.

## 6) Настройки (через admin route)

- `aggregation.interval` (по умолчанию `15m`).
- `reconcile.lookbackDays` (по умолчанию `3`).
- `raw.retentionDays` (по умолчанию `90`).
- `snapshot.enabledReports`.
- `snapshot.intervalByReport`.

## 7) API (минимум)

- `POST /v1/events` — прием события.
- `POST /v1/events/bulk` — пакетный прием.
- `GET /v1/metrics/daily` — чтение дневных агрегатов.
- `GET /v1/metrics/monthly` — чтение месячных агрегатов.
- `GET /v1/reports/:type` — чтение готового snapshot-отчета.
- `PATCH /v1/admin/settings` — смена интервалов/retention.
- `POST /v1/admin/jobs/:jobName/run` — ручной запуск джобы.

## 8) Retention политика

- `events_raw`: 90 дней (MVP).
- `agg_daily_metrics`: долгосрочно.
- `agg_monthly_metrics`: бессрочно.
- `report_snapshots`: по типу отчета (например, 12-24 месяца).

## 9) Почему структура расширяемая

- Добавление новых метрик обычно не требует изменения ingestion API.
- Новые отчеты строятся либо как SQL над агрегатами, либо как snapshot-job.
- Дополнительные измерения можно хранить в `payload` до стабилизации требований.


## 10) Что добавлено в SQL для запуска MVP

- Справочник `stats.event_types` для управляемого списка поддерживаемых событий.
- Таблица `stats.admin_settings` для runtime-настроек агрегации/retention.
- SQL-функции:
  - `stats.recompute_daily_metrics(date_from, date_to)`
  - `stats.recompute_monthly_metrics_from_raw(month_from, month_to)`
  - `stats.cleanup_raw_events(retention_days)`

Эти функции можно дергать из NestJS scheduler-джоб или вручную через admin endpoint.


## 11) Практический pipeline в БД (реализация)

Добавлены SQL-примитивы, которые можно вызывать напрямую из NestJS:

- `stats.ingest_event(...)` — прием и идемпотентная запись события.
- `stats.aggregate_events_incremental(job_name, chunk_size)` — инкрементальная агрегация raw -> daily с `aggregation_state`.
- `stats.rollup_monthly_from_daily(month_from, month_to)` — быстрый rollup daily -> monthly.
- `stats.vw_current_month_org_channel_logins` — пример готовой витрины для чтения.

Операционный порядок вызовов описан в `docs/aggregation-runbook.md`.


## 12) Технические гарантии консистентности

- В агрегатах введена нормализация nullable dimension-полей (`organization_id`, `request_type`, `payment_type`) в sentinel-значения для корректного `ON CONFLICT`.
- `aggregate-events-incremental` защищен транзакционным advisory lock, чтобы не допустить параллельного двойного учета.
- Точный distinct по месяцу по-прежнему обеспечивается через `recompute_monthly_metrics_from_raw`.
