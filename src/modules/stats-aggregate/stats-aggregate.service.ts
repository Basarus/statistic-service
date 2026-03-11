import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StatJobStateEntity } from '../../database/entities/stat-job-state.entity';
import { StatsAggregateRepository } from './repositories/stats-aggregate.repository';

@Injectable()
export class StatsAggregateService {
  private readonly logger = new Logger(StatsAggregateService.name);
  private readonly rawToDailyJobName = 'raw_to_daily';
  private readonly dailyToMonthlyJobName = 'daily_to_monthly';

  constructor(
    private readonly configService: ConfigService,
    private readonly aggregateRepository: StatsAggregateRepository,
    @InjectRepository(StatJobStateEntity)
    private readonly statJobStateRepository: Repository<StatJobStateEntity>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async runRawToDailyAggregation(): Promise<void> {
    try {
      const batchSize = this.configService.get<number>('aggregation.rawToDailyBatchSize', 5000);
      const state = await this.getOrCreateState(this.rawToDailyJobName);
      const lastProcessedAtIso = (state.lastProcessedAt ?? new Date(0)).toISOString();
      const lastProcessedId = state.lastProcessedId ?? '00000000-0000-0000-0000-000000000000';

      await this.aggregateRepository.upsertRawToDaily(lastProcessedAtIso, lastProcessedId, batchSize);
      const row = await this.aggregateRepository.getRawCursor(lastProcessedAtIso, lastProcessedId, batchSize);

      if (!row || row.processed_count === 0 || !row.max_occurred_at || !row.max_event_id) return;

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
      const lastProcessedAtIso = (state.lastProcessedAt ?? new Date(0)).toISOString();

      const changedMonths = await this.aggregateRepository.getChangedMonths(lastProcessedAtIso, batchSize);
      if (changedMonths.length === 0) return;

      for (const item of changedMonths) {
        await this.aggregateRepository.rebuildMonthlySlice(item.year, item.month);
      }

      const maxUpdatedAt = await this.aggregateRepository.getMaxDailyUpdatedAt(lastProcessedAtIso);
      if (!maxUpdatedAt) return;

      state.lastProcessedAt = new Date(maxUpdatedAt);
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
      await this.aggregateRepository.deleteRawBefore(ttlDays);
      this.logger.log(`raw events cleanup completed with ttlDays=${ttlDays}`);
    } catch (error) {
      this.logger.error('raw events cleanup failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async getOrCreateState(jobName: string): Promise<StatJobStateEntity> {
    const existing = await this.statJobStateRepository.findOne({ where: { jobName } });
    if (existing) return existing;
    return this.statJobStateRepository.create({ jobName, lastProcessedAt: null, lastProcessedId: null });
  }
}
