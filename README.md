# statistic-service

NestJS-сервис статистики для приёма событий, агрегации (daily/monthly), и выдачи отчетов.

## Что внутри

- Ingest API `POST /internal/events` с `x-api-key` защитой.
- Aggregation jobs:
  - raw → daily (каждые 10 минут),
  - daily → monthly (каждый час),
  - cleanup raw events (02:00).
- Report API:
  - `GET /reports/metrics`
  - `GET /reports/auth-methods`
  - `GET /reports/request-types`
  - `GET /widgets/current-month`
  - `GET /reports/business-snapshots`
  - `GET /reports/business/conversion`
  - `GET /reports/business/inactive-users`
- Swagger: `/docs`
- Healthcheck: `GET /health`

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Сборка и тесты

```bash
npm run build
npm test
npm run test:e2e
```

## Переменные окружения

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=statistic_service
INTERNAL_API_KEY=change-me
AGGREGATION_RAW_TO_DAILY_BATCH_SIZE=5000
AGGREGATION_DAILY_TO_MONTHLY_BATCH_SIZE=1000
RAW_EVENTS_TTL_DAYS=90
```

## Дополнительно

- Карта событий: `docs/event-map.md`.
