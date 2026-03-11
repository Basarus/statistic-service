import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatAggregateDailyEntity } from '../../database/entities/stat-aggregate-daily.entity';
import { StatAggregateMonthlyEntity } from '../../database/entities/stat-aggregate-monthly.entity';
import { StatsReportController } from './stats-report.controller';
import { StatsReportRepository } from './repositories/stats-report.repository';
import { StatsReportService } from './stats-report.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatAggregateDailyEntity, StatAggregateMonthlyEntity])],
  controllers: [StatsReportController],
  providers: [StatsReportService, StatsReportRepository],
})
export class StatsReportModule {}
