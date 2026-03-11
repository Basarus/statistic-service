# statistic-service (Next.js + TypeScript)

MVP API layer over PostgreSQL functions/views from `db/migrations/*`.

## Run

```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/statsdb npm run dev
```

## Endpoints

- `POST /api/v1/events`
- `GET /api/v1/metrics/daily`
- `GET /api/v1/metrics/monthly`
- `GET /api/v1/reports/:type`
- `PATCH /api/v1/admin/settings`
- `GET /api/v1/admin/settings`
- `POST /api/v1/admin/jobs/pipeline-tick/run`

## Notes

- The app expects DB migrations to be applied beforehand.
- Routes call SQL functions (`stats.ingest_event`, `stats.run_pipeline_tick`) and read from aggregate tables/views.
