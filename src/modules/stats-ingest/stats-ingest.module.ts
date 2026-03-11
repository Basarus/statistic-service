import { Module } from '@nestjs/common';

import { StatsIngestController } from './stats-ingest.controller';
import { StatsIngestService } from './stats-ingest.service';

@Module({
  controllers: [StatsIngestController],
  providers: [StatsIngestService],
})
export class StatsIngestModule {}
