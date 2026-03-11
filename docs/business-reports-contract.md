# Бизнес-контракт отчетов (MVP)

Документ фиксирует, из каких таблиц/вью читаются ключевые метрики для бизнеса и администраторов.

## 1) Список УЗ без ЛС (MRGLKA-3909)

Источник: `stats.vw_state_metrics_latest`

Поля:
- `organization_id`
- `accounts_without_ls_count`
- `snapshot_date`

## 2) Список ЛС без УЗ (MRGLKA-3910)

Источник: `stats.vw_state_metrics_latest`

Поля:
- `organization_id`
- `ls_without_accounts_count`
- `snapshot_date`

## 3) УЗ без активности 6 месяцев (MRGLKA-3911)

Источник: `stats.vw_state_metrics_latest`

Поля:
- `organization_id`
- `inactive_accounts_6m_count`
- `snapshot_date`

## 4) Конверсия (MRGLKA-3912)

Источник: `stats.vw_state_metrics_latest`

Поля:
- `organization_id`
- `conversion_percent`
- `total_accounts_count`
- `linked_ls_count`
- `snapshot_date`

## 5) Динамика учетных записей / подключения ЛС

Источник: `stats.state_daily_snapshots`

Рекомендованные поля для графиков:
- `snapshot_date`
- `total_accounts_count`
- `total_ls_count`
- `linked_ls_count`

## 6) Статистика по типам платежей

Источник: `stats.vw_monthly_payment_type_stats`

Поля:
- `metric_month`
- `organization_id`
- `payment_type`
- `total_payments`
- `unique_payers`

## 7) Статистика по сервисам авторизации

Источник: `stats.vw_monthly_auth_method_stats`

Поля:
- `metric_month`
- `organization_id`
- `auth_method`
- `total_logins`
- `unique_users`

## 8) Логины web/mobile по организации за месяц

Источник: `stats.vw_monthly_org_logins_channels`

Поля:
- `metric_month`
- `organization_id`
- `platform`
- `total_logins`
- `unique_users`

## 9) Заявки по типам (ЛКА / поставщик)

Источник: `stats.vw_monthly_request_type_stats`

Поля:
- `metric_month`
- `organization_id`
- `event_type` (`request_created`, `provider_request_sent`)
- `request_type`
- `total_requests`
- `unique_users`
