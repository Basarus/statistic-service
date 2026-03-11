# statistic-service (NestJS + TypeScript + PostgreSQL)

Statistics microservice scaffold with event storage and aggregation data model.

## Features

- NestJS application bootstrap
- PostgreSQL connection via TypeORM
- Global request validation (`ValidationPipe`)
- Swagger documentation (`/docs`)
- Health endpoint (`GET /health`)
- Internal ingestion endpoint (`POST /internal/events`) protected with `x-api-key`
- Report APIs: `GET /reports/metrics`, `GET /reports/auth-methods`, `GET /reports/request-types`, `GET /widgets/current-month`
- Scheduled aggregation jobs: raw→daily (10 min), daily→monthly (hourly), raw cleanup (2 AM)
- Data model entities for events, daily/monthly aggregates, metrics, and job state
- TypeORM migration for `stat_event`, `stat_aggregate_daily`, `stat_aggregate_monthly`, `stat_metric`, `stat_job_state`
- Event map documentation for monolith integration (`docs/event-map.md`)

## Run

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Environment

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
