# statistic-service (NestJS + TypeScript + PostgreSQL)

Base scaffold for the statistics microservice.

## Features

- NestJS application bootstrap
- PostgreSQL connection via TypeORM
- Global request validation (`ValidationPipe`)
- Swagger documentation (`/docs`)
- Health endpoint (`GET /health`)
- Base module structure for ingest/aggregate/report flows

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
```
