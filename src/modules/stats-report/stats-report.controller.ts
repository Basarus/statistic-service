import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { GetAuthMethodsQueryDto } from './dto/get-auth-methods-query.dto';
import { CurrentMonthWidgetQueryDto } from './dto/current-month-widget-query.dto';
import { GetMetricsQueryDto } from './dto/get-metrics-query.dto';
import { GetRequestTypesQueryDto } from './dto/get-request-types-query.dto';
import { StatsReportService } from './stats-report.service';

@ApiTags('stats-report')
@Controller()
export class StatsReportController {
  constructor(private readonly statsReportService: StatsReportService) {}

  @Get('reports/metrics')
  @ApiOkResponse({ description: 'Aggregated metrics points' })
  getMetrics(@Query() query: GetMetricsQueryDto) {
    return this.statsReportService.getMetrics(query);
  }

  @Get('widgets/current-month')
  @ApiOkResponse({ description: 'Current month widget summary' })
  getCurrentMonthWidget(@Query() query: CurrentMonthWidgetQueryDto) {
    return this.statsReportService.getCurrentMonthWidget(query.organizationId);
  }

  @Get('reports/auth-methods')
  @ApiOkResponse({ description: 'Auth method split' })
  getAuthMethods(@Query() query: GetAuthMethodsQueryDto) {
    return this.statsReportService.getAuthMethods(query);
  }

  @Get('reports/request-types')
  @ApiOkResponse({ description: 'Request types split' })
  getRequestTypes(@Query() query: GetRequestTypesQueryDto) {
    return this.statsReportService.getRequestTypes(query);
  }
}
