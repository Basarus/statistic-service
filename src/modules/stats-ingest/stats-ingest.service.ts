import { Injectable } from '@nestjs/common';

import { CreateStatEventDto } from './dto/create-stat-event.dto';

@Injectable()
export class StatsIngestService {
  ingestEvent(dto: CreateStatEventDto) {
    return {
      accepted: true,
      eventUuid: dto.eventUuid,
    };
  }
}
