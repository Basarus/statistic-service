import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
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
  @ApiHeader({ name: 'x-api-key', required: true })
  @ApiBody({ type: CreateStatEventDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        accepted: true,
        duplicate: false,
        eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid internal API key' })
  async create(@Body() dto: CreateStatEventDto) {
    return this.statsIngestService.ingestEvent(dto);
  }
}
