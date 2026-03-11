import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import { CreateStatEventDto } from './dto/create-stat-event.dto';
import { StatsIngestService } from './stats-ingest.service';

@ApiTags('stats-ingest')
@Controller('api/v1/events')
export class StatsIngestController {
  constructor(private readonly statsIngestService: StatsIngestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateStatEventDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        accepted: true,
        eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  create(@Body() dto: CreateStatEventDto) {
    return this.statsIngestService.ingestEvent(dto);
  }
}
