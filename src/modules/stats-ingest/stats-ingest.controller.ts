import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateStatEventDto } from './dto/create-stat-event.dto';
import { StatsIngestAuthGuard } from './stats-ingest.auth.guard';
import { StatsIngestService } from './stats-ingest.service';

@ApiTags('stats-ingest')
@Controller('internal/events')
export class StatsIngestController {
  constructor(private readonly statsIngestService: StatsIngestService) {}

  @Post()
  @UseGuards(StatsIngestAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ingest internal monolith event (idempotent by eventUuid)' })
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Internal service API key' })
  @ApiBody({ type: CreateStatEventDto })
  @ApiCreatedResponse({
    description: 'Event accepted. duplicate=true means eventUuid was already ingested.',
    schema: {
      example: {
        accepted: true,
        duplicate: false,
        eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid payload or forbidden payload keys' })
  @ApiUnauthorizedResponse({ description: 'Invalid internal API key' })
  async create(@Body() dto: CreateStatEventDto) {
    return this.statsIngestService.ingestEvent(dto);
  }
}
