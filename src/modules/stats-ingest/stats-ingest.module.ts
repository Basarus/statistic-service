import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatEventEntity } from '../../database/entities/stat-event.entity';
import { StatsIngestAuthGuard } from './stats-ingest.auth.guard';
import { StatsIngestController } from './stats-ingest.controller';
import { StatsIngestService } from './stats-ingest.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatEventEntity])],
  controllers: [StatsIngestController],
  providers: [StatsIngestService, StatsIngestAuthGuard],
})
export class StatsIngestModule {}
