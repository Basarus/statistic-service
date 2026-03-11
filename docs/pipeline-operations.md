# Pipeline operations (MVP)

Документ описывает единый SQL-вызов для scheduler и аудит запусков.

## 1) Единый tick для планировщика

```sql
SELECT *
FROM stats.run_pipeline_tick(
  p_incremental_chunk_size => 50000,
  p_reconcile_lookback_days => 3,
  p_retention_days => 90
);
```

Что делает внутри:
1. запускает `aggregate_events_incremental`;
2. делает nightly-style reconcile за окно `lookback_days`;
3. пересчитывает monthly-агрегаты в точном режиме из raw;
4. удаляет raw по retention;
5. пишет аудит в `stats.job_runs`.

## 2) Просмотр последних запусков

```sql
SELECT *
FROM stats.vw_job_runs_latest;
```

Для детального разбора:

```sql
SELECT *
FROM stats.job_runs
WHERE job_name = 'pipeline-tick'
ORDER BY id DESC
LIMIT 100;
```

## 3) Рекомендации по расписанию

- Tick каждые 15 минут для near-realtime витрин.
- Дополнительно можно оставить отдельный ночной запуск с большим `lookback_days` (например, 7).
- В случае ошибок — алерт по `status = 'failed'` и разбор `details->>'error'`.


## 4) Гарантии консистентности pipeline-tick

- В `pipeline-tick` месячные агрегаты считаются **только** через `recompute_monthly_metrics_from_raw` (точный distinct).
- `rollup_monthly_from_daily` оставлен как вспомогательный быстрый режим, но не вызывается внутри `pipeline-tick`.
- `aggregate_events_incremental` обновляет `last_event_id` на основе **того же chunk**, который был агрегирован, чтобы исключить рассинхрон курсора.
