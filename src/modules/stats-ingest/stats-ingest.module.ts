import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatEventEntity } from '../../database/entities/stat-event.entity';
import { StatEventWriteRepository } from './repositories/stat-event-write.repository';
import { StatsIngestAuthGuard } from './stats-ingest.auth.guard';
import { StatsIngestController } from './stats-ingest.controller';
import { StatsIngestService } from './stats-ingest.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatEventEntity])],
  controllers: [StatsIngestController],
  providers: [StatsIngestService, StatsIngestAuthGuard, StatEventWriteRepository],
  exports: [StatsIngestService],
})
export class StatsIngestModule {}
