import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatJobStateEntity } from '../../database/entities/stat-job-state.entity';
import { StatsAggregateRepository } from './repositories/stats-aggregate.repository';
import { StatsAggregateService } from './stats-aggregate.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatJobStateEntity])],
  providers: [StatsAggregateService, StatsAggregateRepository],
  exports: [StatsAggregateService],
})
export class StatsAggregateModule {}
