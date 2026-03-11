import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { StatJobStateEntity } from '../../database/entities/stat-job-state.entity';

@Injectable()
export class StatsAggregateService {
  private readonly logger = new Logger(StatsAggregateService.name);
  private readonly rawToDailyJobName = 'raw_to_daily';
  private readonly dailyToMonthlyJobName = 'daily_to_monthly';

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(StatJobStateEntity)
    private readonly statJobStateRepository: Repository<StatJobStateEntity>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async runRawToDailyAggregation(): Promise<void> {
    try {
      const batchSize = this.configService.get<number>('aggregation.rawToDailyBatchSize', 5000);
      const state = await this.getOrCreateState(this.rawToDailyJobName);

      const lastProcessedAt = state.lastProcessedAt ?? new Date(0);
      const lastProcessedId = state.lastProcessedId ?? '00000000-0000-0000-0000-000000000000';

      const result = await this.dataSource.query(
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
          INNER JOIN stat_metric m
            ON m.event_name = e.event_name
           AND m.is_active = true
          WHERE (e.occurred_at > $1 OR (e.occurred_at = $1 AND e.id > $2))
          ORDER BY e.occurred_at ASC, e.id ASC
          LIMIT $3
        ),
        aggregated AS (
          SELECT
            metric_date,
            organization_id,
            metric_code,
            dimension_platform,
            dimension_auth_method,
            dimension_request_type,
            dimension_provider_id,
            dimension_service_type,
            COUNT(*)::bigint AS value_total,
            COUNT(DISTINCT user_id)::bigint AS value_unique_users,
            COUNT(DISTINCT personal_account_id)::bigint AS value_unique_accounts
          FROM source_events
          GROUP BY
            metric_date,
            organization_id,
            metric_code,
            dimension_platform,
            dimension_auth_method,
            dimension_request_type,
            dimension_provider_id,
            dimension_service_type
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
          metric_date,
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
          now(),
          now()
        FROM aggregated
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
        [lastProcessedAt.toISOString(), lastProcessedId, batchSize],
      );

      const cursor = (await this.dataSource.query(
        `
        SELECT
          MAX(e.occurred_at) AS max_occurred_at,
          MAX(e.id)::text AS max_event_id,
          COUNT(*)::int AS processed_count
        FROM (
          SELECT id, occurred_at
          FROM stat_event
          WHERE (occurred_at > $1 OR (occurred_at = $1 AND id > $2))
          ORDER BY occurred_at ASC, id ASC
          LIMIT $3
        ) e
        `,
        [lastProcessedAt.toISOString(), lastProcessedId, batchSize],
      )) as Array<{ max_occurred_at: string | null; max_event_id: string | null; processed_count: number }>;

      const row = cursor[0];

      if (!row || row.processed_count === 0 || !row.max_occurred_at || !row.max_event_id) {
        return;
      }

      state.lastProcessedAt = new Date(row.max_occurred_at);
      state.lastProcessedId = row.max_event_id;
      await this.statJobStateRepository.save(state);
      this.logger.log(`raw_to_daily processed ${row.processed_count} events`);
    } catch (error) {
      this.logger.error('raw_to_daily aggregation failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runDailyToMonthlyAggregation(): Promise<void> {
    try {
      const batchSize = this.configService.get<number>('aggregation.dailyToMonthlyBatchSize', 1000);
      const state = await this.getOrCreateState(this.dailyToMonthlyJobName);
      const lastProcessedAt = state.lastProcessedAt ?? new Date(0);

      const changedMonths = (await this.dataSource.query(
        `
        SELECT DISTINCT
          EXTRACT(YEAR FROM date)::int AS year,
          EXTRACT(MONTH FROM date)::int AS month
        FROM stat_aggregate_daily
        WHERE updated_at > $1
        ORDER BY year, month
        LIMIT $2
        `,
        [lastProcessedAt.toISOString(), batchSize],
      )) as Array<{ year: number; month: number }>;

      if (changedMonths.length === 0) {
        return;
      }

      for (const item of changedMonths) {
        await this.dataSource.query('DELETE FROM stat_aggregate_monthly WHERE year = $1 AND month = $2', [item.year, item.month]);

        await this.dataSource.query(
          `
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
            EXTRACT(YEAR FROM date)::int,
            EXTRACT(MONTH FROM date)::int,
            organization_id,
            metric_code,
            dimension_platform,
            dimension_auth_method,
            dimension_request_type,
            dimension_provider_id,
            dimension_service_type,
            SUM(value_total)::bigint,
            SUM(value_unique_users)::bigint,
            SUM(value_unique_accounts)::bigint,
            now(),
            now()
          FROM stat_aggregate_daily
          WHERE EXTRACT(YEAR FROM date)::int = $1
            AND EXTRACT(MONTH FROM date)::int = $2
          GROUP BY
            organization_id,
            metric_code,
            dimension_platform,
            dimension_auth_method,
            dimension_request_type,
            dimension_provider_id,
            dimension_service_type
          `,
          [item.year, item.month],
        );
      }

      const maxUpdatedAt = (await this.dataSource.query(
        `
        SELECT MAX(updated_at) AS max_updated_at
        FROM stat_aggregate_daily
        WHERE updated_at > $1
        `,
        [lastProcessedAt.toISOString()],
      )) as Array<{ max_updated_at: string | null }>;

      const value = maxUpdatedAt[0]?.max_updated_at;

      if (!value) {
        return;
      }

      state.lastProcessedAt = new Date(value);
      state.lastProcessedId = null;
      await this.statJobStateRepository.save(state);
      this.logger.log(`daily_to_monthly rebuilt ${changedMonths.length} month slices`);
    } catch (error) {
      this.logger.error('daily_to_monthly aggregation failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupRawEvents(): Promise<void> {
    try {
      const ttlDays = this.configService.get<number>('aggregation.rawEventsTtlDays', 90);

      await this.dataSource.query(
        `
        DELETE FROM stat_event
        WHERE occurred_at < now() - make_interval(days => $1)
        `,
        [ttlDays],
      );

      this.logger.log(`raw events cleanup completed with ttlDays=${ttlDays}`);
    } catch (error) {
      this.logger.error('raw events cleanup failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async getOrCreateState(jobName: string): Promise<StatJobStateEntity> {
    const existing = await this.statJobStateRepository.findOne({ where: { jobName } });

    if (existing) {
      return existing;
    }

    return this.statJobStateRepository.create({
      jobName,
      lastProcessedAt: null,
      lastProcessedId: null,
    });
  }
}
