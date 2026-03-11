import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatJobStateEntity } from '../../database/entities/stat-job-state.entity';
import { StatsAggregateService } from './stats-aggregate.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatJobStateEntity])],
  providers: [StatsAggregateService],
  exports: [StatsAggregateService],
})
export class StatsAggregateModule {}
