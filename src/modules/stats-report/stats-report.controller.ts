import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Get aggregated metrics points by day or month' })
  @ApiQuery({ name: 'metricCode', required: true })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'groupBy', required: true, enum: ['day', 'month'] })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'authMethod', required: false })
  @ApiQuery({ name: 'requestType', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiOkResponse({
    description: 'Aggregated metrics points',
    schema: {
      example: [{ period: '2026-03-01', valueTotal: 120, valueUniqueUsers: 98, valueUniqueAccounts: 91 }],
    },
  })
  getMetrics(@Query() query: GetMetricsQueryDto) {
    return this.statsReportService.getMetrics(query);
  }

  @Get('widgets/current-month')
  @ApiOperation({ summary: 'Get current month organization summary widget' })
  @ApiOkResponse({
    description: 'Current month widget summary',
    schema: {
      example: {
        webLogins: 100,
        mobileLogins: 80,
        uniqueUsers: 140,
        successfulPayments: 50,
        meterReadingsSent: 45,
        receiptsDownloaded: 30,
        requestsSent: 60,
      },
    },
  })
  getCurrentMonthWidget(@Query() query: CurrentMonthWidgetQueryDto) {
    return this.statsReportService.getCurrentMonthWidget(query.organizationId);
  }

  @Get('reports/auth-methods')
  @ApiOperation({ summary: 'Get auth-method split (email/phone/vk/other)' })
  @ApiOkResponse({
    description: 'Auth method split',
    schema: { example: { email: 120, phone: 80, vk: 20, other: 10 } },
  })
  getAuthMethods(@Query() query: GetAuthMethodsQueryDto) {
    return this.statsReportService.getAuthMethods(query);
  }

  @Get('reports/request-types')
  @ApiOperation({ summary: 'Get request-type split' })
  @ApiOkResponse({
    description: 'Request type split',
    schema: { example: [{ requestType: 'verification', valueTotal: 58 }] },
  })
  getRequestTypes(@Query() query: GetRequestTypesQueryDto) {
    return this.statsReportService.getRequestTypes(query);
  }
}
