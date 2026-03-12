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
- Business metrics APIs: `POST /internal/business-snapshots`, `GET /reports/business-snapshots`, `GET /reports/business/conversion`, `GET /reports/business/inactive-users`
- Scheduled aggregation jobs: raw→daily (10 min), daily→monthly (hourly), raw cleanup (2 AM)
- Data model entities for events, daily/monthly aggregates, metrics, and job state
- TypeORM migration for `stat_event`, `stat_aggregate_daily`, `stat_aggregate_monthly`, `stat_metric`, `stat_job_state`
- Event map documentation for monolith integration (`docs/event-map.md`)
- Next iteration: partition `stat_event` by month to reduce raw-table maintenance costs

## Features

- NestJS application bootstrap
- PostgreSQL connection via TypeORM
- Global request validation (`ValidationPipe`)
- Swagger documentation (`/docs`)
- Health endpoint (`GET /health`)
- Internal ingestion endpoint (`POST /internal/events`) protected with `x-api-key`
- Report APIs: `GET /reports/metrics`, `GET /reports/auth-methods`, `GET /reports/request-types`, `GET /widgets/current-month`
- Business metrics APIs: `POST /internal/business-snapshots`, `GET /reports/business-snapshots`, `GET /reports/business/conversion`, `GET /reports/business/inactive-users`
- Scheduled aggregation jobs: raw→daily (10 min), daily→monthly (hourly), raw cleanup (2 AM)
- Data model entities for events, daily/monthly aggregates, metrics, and job state
- TypeORM migration for `stat_event`, `stat_aggregate_daily`, `stat_aggregate_monthly`, `stat_metric`, `stat_job_state`
- Event map documentation for monolith integration (`docs/event-map.md`)
- Next iteration: partition `stat_event` by month to reduce raw-table maintenance costs

## Features

- NestJS application bootstrap
- PostgreSQL connection via TypeORM
- Global request validation (`ValidationPipe`)
- Swagger documentation (`/docs`)
- Health endpoint (`GET /health`)
- Internal ingestion endpoint (`POST /internal/events`) protected with `x-api-key`
- Report APIs: `GET /reports/metrics`, `GET /reports/auth-methods`, `GET /reports/request-types`, `GET /widgets/current-month`
- Business metrics APIs: `POST /internal/business-snapshots`, `GET /reports/business-snapshots`, `GET /reports/business/conversion`, `GET /reports/business/inactive-users`
- Scheduled aggregation jobs: raw→daily (10 min), daily→monthly (hourly), raw cleanup (2 AM)
- Data model entities for events, daily/monthly aggregates, metrics, and job state
- TypeORM migration for `stat_event`, `stat_aggregate_daily`, `stat_aggregate_monthly`, `stat_metric`, `stat_job_state`
- Event map documentation for monolith integration (`docs/event-map.md`)

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

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
## PR reopen note

This commit adds a small README-only update to reopen and refresh the broken PR pipeline.

