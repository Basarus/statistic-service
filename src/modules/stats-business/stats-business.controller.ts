import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { StatsIngestAuthGuard } from '../stats-ingest/stats-ingest.auth.guard';
import { GetBusinessSnapshotsQueryDto } from './dto/get-business-snapshots-query.dto';
import { GetConversionQueryDto } from './dto/get-conversion-query.dto';
import { GetInactiveUsersQueryDto } from './dto/get-inactive-users-query.dto';
import { UpsertBusinessSnapshotDto } from './dto/upsert-business-snapshot.dto';
import { StatsBusinessService } from './stats-business.service';

@ApiTags('stats-business')
@Controller()
export class StatsBusinessController {
  constructor(private readonly statsBusinessService: StatsBusinessService) {}

  @Post('internal/business-snapshots')
  @UseGuards(StatsIngestAuthGuard)
  upsertSnapshot(@Body() dto: UpsertBusinessSnapshotDto) {
    return this.statsBusinessService.upsertSnapshot(dto);
  }

  @Get('reports/business-snapshots')
  @ApiOkResponse({ description: 'Business snapshots list' })
  getSnapshots(@Query() query: GetBusinessSnapshotsQueryDto) {
    return this.statsBusinessService.getSnapshots(query);
  }

  @Get('reports/business/conversion')
  @ApiOkResponse({ description: 'Conversion funnel' })
  getConversion(@Query() query: GetConversionQueryDto) {
    return this.statsBusinessService.getConversion(query);
  }

  @Get('reports/business/inactive-users')
  @ApiOkResponse({ description: 'Inactive users over 6 months snapshot' })
  getInactiveUsers(@Query() query: GetInactiveUsersQueryDto) {
    return this.statsBusinessService.getLatestInactiveUsers(query.organizationId);
  }
}
