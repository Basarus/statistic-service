import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatBusinessSnapshotEntity } from '../../database/entities/stat-business-snapshot.entity';
import { StatsIngestAuthGuard } from '../stats-ingest/stats-ingest.auth.guard';
import { StatsBusinessController } from './stats-business.controller';
import { StatsBusinessRepository } from './repositories/stats-business.repository';
import { StatsBusinessService } from './stats-business.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatBusinessSnapshotEntity])],
  controllers: [StatsBusinessController],
  providers: [StatsBusinessService, StatsBusinessRepository, StatsIngestAuthGuard],
})
export class StatsBusinessModule {}
