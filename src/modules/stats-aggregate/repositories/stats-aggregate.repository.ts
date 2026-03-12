import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class StatsAggregateRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsertRawToDaily(lastProcessedAtIso: string, lastProcessedId: string, batchSize: number): Promise<void> {
    await this.dataSource.query(
      `
      WITH source_events AS (
        SELECT
          e.id,
          e.occurred_at,
          date_trunc('day', e.occurred_at)::date AS metric_date,
          e.organization_id,
          m.code AS metric_code,
          e.platform AS dimension_platform,
          e.auth_method AS dimension_auth_method,
          e.request_type AS dimension_request_type,
          e.provider_id AS dimension_provider_id,
          e.service_type AS dimension_service_type,
          e.user_id,
          e.personal_account_id
        FROM stat_event e
        INNER JOIN stat_metric m ON m.event_name = e.event_name AND m.is_active = true
        WHERE (e.occurred_at > $1 OR (e.occurred_at = $1 AND e.id > $2))
        ORDER BY e.occurred_at ASC, e.id ASC
        LIMIT $3
      ),
      aggregated_totals AS (
        SELECT
          metric_date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          COUNT(*)::bigint AS value_total
        FROM source_events
        GROUP BY metric_date, organization_id, metric_code, dimension_platform, dimension_auth_method, dimension_request_type, dimension_provider_id, dimension_service_type
      ),
      inserted_users AS (
        INSERT INTO stat_aggregate_daily_unique_user (
          date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          user_id
        )
        SELECT DISTINCT
          metric_date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          user_id
        FROM source_events
        WHERE user_id IS NOT NULL
        ON CONFLICT DO NOTHING
        RETURNING
          date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type
      ),
      aggregated_new_users AS (
        SELECT
          date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          COUNT(*)::bigint AS value_unique_users
        FROM inserted_users
        GROUP BY date, organization_id, metric_code, dimension_platform, dimension_auth_method, dimension_request_type, dimension_provider_id, dimension_service_type
      ),
      inserted_accounts AS (
        INSERT INTO stat_aggregate_daily_unique_account (
          date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          personal_account_id
        )
        SELECT DISTINCT
          metric_date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          personal_account_id
        FROM source_events
        WHERE personal_account_id IS NOT NULL
        ON CONFLICT DO NOTHING
        RETURNING
          date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type
      ),
      aggregated_new_accounts AS (
        SELECT
          date,
          organization_id,
          metric_code,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type,
          COUNT(*)::bigint AS value_unique_accounts
        FROM inserted_accounts
        GROUP BY date, organization_id, metric_code, dimension_platform, dimension_auth_method, dimension_request_type, dimension_provider_id, dimension_service_type
      )
      INSERT INTO stat_aggregate_daily (
        date,
        organization_id,
        metric_code,
        dimension_platform,
        dimension_auth_method,
        dimension_request_type,
        dimension_provider_id,
        dimension_service_type,
        value_total,
        value_unique_users,
        value_unique_accounts,
        created_at,
        updated_at
      )
      SELECT
        t.metric_date,
        t.organization_id,
        t.metric_code,
        t.dimension_platform,
        t.dimension_auth_method,
        t.dimension_request_type,
        t.dimension_provider_id,
        t.dimension_service_type,
        t.value_total,
        COALESCE(u.value_unique_users, 0),
        COALESCE(a.value_unique_accounts, 0),
        now(),
        now()
      FROM aggregated_totals t
      LEFT JOIN aggregated_new_users u
        ON u.date = t.metric_date
       AND u.organization_id = t.organization_id
       AND u.metric_code = t.metric_code
       AND u.dimension_platform IS NOT DISTINCT FROM t.dimension_platform
       AND u.dimension_auth_method IS NOT DISTINCT FROM t.dimension_auth_method
       AND u.dimension_request_type IS NOT DISTINCT FROM t.dimension_request_type
       AND u.dimension_provider_id IS NOT DISTINCT FROM t.dimension_provider_id
       AND u.dimension_service_type IS NOT DISTINCT FROM t.dimension_service_type
      LEFT JOIN aggregated_new_accounts a
        ON a.date = t.metric_date
       AND a.organization_id = t.organization_id
       AND a.metric_code = t.metric_code
       AND a.dimension_platform IS NOT DISTINCT FROM t.dimension_platform
       AND a.dimension_auth_method IS NOT DISTINCT FROM t.dimension_auth_method
       AND a.dimension_request_type IS NOT DISTINCT FROM t.dimension_request_type
       AND a.dimension_provider_id IS NOT DISTINCT FROM t.dimension_provider_id
       AND a.dimension_service_type IS NOT DISTINCT FROM t.dimension_service_type
      ON CONFLICT (
        date,
        organization_id,
        metric_code,
        dimension_platform,
        dimension_auth_method,
        dimension_request_type,
        dimension_provider_id,
        dimension_service_type
      )
      DO UPDATE SET
        value_total = stat_aggregate_daily.value_total + EXCLUDED.value_total,
        value_unique_users = stat_aggregate_daily.value_unique_users + EXCLUDED.value_unique_users,
        value_unique_accounts = stat_aggregate_daily.value_unique_accounts + EXCLUDED.value_unique_accounts,
        updated_at = now();
      `,
      [lastProcessedAtIso, lastProcessedId, batchSize],
    );
  }

  async getRawCursor(lastProcessedAtIso: string, lastProcessedId: string, batchSize: number) {
    const rows = (await this.dataSource.query(
      `
      SELECT MAX(e.occurred_at) AS max_occurred_at, MAX(e.id)::text AS max_event_id, COUNT(*)::int AS processed_count
      FROM (
        SELECT id, occurred_at
        FROM stat_event
        WHERE (occurred_at > $1 OR (occurred_at = $1 AND id > $2))
        ORDER BY occurred_at ASC, id ASC
        LIMIT $3
      ) e
      `,
      [lastProcessedAtIso, lastProcessedId, batchSize],
    )) as Array<{ max_occurred_at: string | null; max_event_id: string | null; processed_count: number }>;

    return rows[0];
  }

  async getChangedMonths(lastProcessedAtIso: string, batchSize: number) {
    return (await this.dataSource.query(
      `
      SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year, EXTRACT(MONTH FROM date)::int AS month
      FROM stat_aggregate_daily
      WHERE updated_at > $1
      ORDER BY year, month
      LIMIT $2
      `,
      [lastProcessedAtIso, batchSize],
    )) as Array<{ year: number; month: number }>;
  }

  async rebuildMonthlySlice(year: number, month: number): Promise<void> {
    await this.dataSource.query('DELETE FROM stat_aggregate_monthly WHERE year = $1 AND month = $2', [year, month]);

    await this.dataSource.query(
      `
      WITH monthly_events AS (
        SELECT
          e.organization_id,
          m.code AS metric_code,
          e.platform AS dimension_platform,
          e.auth_method AS dimension_auth_method,
          e.request_type AS dimension_request_type,
          e.provider_id AS dimension_provider_id,
          e.service_type AS dimension_service_type,
          e.user_id,
          e.personal_account_id
        FROM stat_event e
        INNER JOIN stat_metric m ON m.event_name = e.event_name AND m.is_active = true
        WHERE EXTRACT(YEAR FROM e.occurred_at)::int = $1
          AND EXTRACT(MONTH FROM e.occurred_at)::int = $2
      )
      INSERT INTO stat_aggregate_monthly (
        year,
        month,
        organization_id,
        metric_code,
        dimension_platform,
        dimension_auth_method,
        dimension_request_type,
        dimension_provider_id,
        dimension_service_type,
        value_total,
        value_unique_users,
        value_unique_accounts,
        created_at,
        updated_at
      )
      SELECT
        $1,
        $2,
        organization_id,
        metric_code,
        dimension_platform,
        dimension_auth_method,
        dimension_request_type,
        dimension_provider_id,
        dimension_service_type,
        COUNT(*)::bigint,
        COUNT(DISTINCT user_id)::bigint,
        COUNT(DISTINCT personal_account_id)::bigint,
        now(),
        now()
      FROM monthly_events
      GROUP BY organization_id, metric_code, dimension_platform, dimension_auth_method, dimension_request_type, dimension_provider_id, dimension_service_type
      `,
      [year, month],
    );
  }

  async getMaxDailyUpdatedAt(lastProcessedAtIso: string): Promise<string | null> {
    const rows = (await this.dataSource.query(
      'SELECT MAX(updated_at) AS max_updated_at FROM stat_aggregate_daily WHERE updated_at > $1',
      [lastProcessedAtIso],
    )) as Array<{ max_updated_at: string | null }>;
    return rows[0]?.max_updated_at ?? null;
  }

  async deleteRawBefore(ttlDays: number): Promise<void> {
    await this.dataSource.query('DELETE FROM stat_event WHERE occurred_at < now() - make_interval(days => $1)', [ttlDays]);
  }
}
