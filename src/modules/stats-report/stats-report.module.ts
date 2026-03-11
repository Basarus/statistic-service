import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatAggregateDailyEntity } from '../../database/entities/stat-aggregate-daily.entity';
import { StatAggregateMonthlyEntity } from '../../database/entities/stat-aggregate-monthly.entity';
import { StatsReportController } from './stats-report.controller';
import { StatsReportService } from './stats-report.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatAggregateDailyEntity, StatAggregateMonthlyEntity])],
  controllers: [StatsReportController],
  providers: [StatsReportService],
})
export class StatsReportModule {}
