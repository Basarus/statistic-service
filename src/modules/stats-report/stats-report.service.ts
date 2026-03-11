import { Injectable } from '@nestjs/common';

import { GetAuthMethodsQueryDto } from './dto/get-auth-methods-query.dto';
import { GetMetricsQueryDto, MetricsGroupBy } from './dto/get-metrics-query.dto';
import { GetRequestTypesQueryDto } from './dto/get-request-types-query.dto';
import { StatsReportRepository } from './repositories/stats-report.repository';

@Injectable()
export class StatsReportService {
  constructor(private readonly statsReportRepository: StatsReportRepository) {}

  async getMetrics(query: GetMetricsQueryDto) {
    if (query.groupBy === MetricsGroupBy.DAY) {
      const rows = await this.statsReportRepository.getDailyMetricsRows(query);
      return rows.map((row) => ({
        period: row.period,
        valueTotal: Number(row.valueTotal),
        valueUniqueUsers: Number(row.valueUniqueUsers),
        valueUniqueAccounts: Number(row.valueUniqueAccounts),
      }));
    }

    const from = new Date(query.dateFrom);
    const to = new Date(query.dateTo);
    const fromYm = from.getUTCFullYear() * 100 + (from.getUTCMonth() + 1);
    const toYm = to.getUTCFullYear() * 100 + (to.getUTCMonth() + 1);
    const rows = await this.statsReportRepository.getMonthlyMetricsRows(query, fromYm, toYm);

    return rows.map((row) => ({
      period: row.period,
      valueTotal: Number(row.valueTotal),
      valueUniqueUsers: Number(row.valueUniqueUsers),
      valueUniqueAccounts: Number(row.valueUniqueAccounts),
    }));
  }

  async getCurrentMonthWidget(organizationId: number) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const rows = await this.statsReportRepository.getCurrentMonthRows(organizationId, year, month);

    const getTotal = (metricCode: string, platform?: string) =>
      rows
        .filter((row) => row.metricCode === metricCode && (platform ? row.platform === platform : true))
        .reduce((acc, row) => acc + Number(row.valueTotal), 0);

    const getUniqueUsers = (metricCode: string) =>
      rows.filter((row) => row.metricCode === metricCode).reduce((acc, row) => acc + Number(row.valueUniqueUsers), 0);

    return {
      webLogins: getTotal('login_success', 'web'),
      mobileLogins: getTotal('login_success', 'mobile'),
      uniqueUsers: getUniqueUsers('login_success'),
      successfulPayments: getTotal('payment_success'),
      meterReadingsSent: getTotal('meter_reading_success'),
      receiptsDownloaded: getTotal('receipt_download'),
      requestsSent: getTotal('request_sent_lka') + getTotal('request_sent_provider'),
    };
  }

  async getAuthMethods(query: GetAuthMethodsQueryDto) {
    const rows = await this.statsReportRepository.getAuthMethodRows(query);
    const result = { email: 0, phone: 0, vk: 0, other: 0 };

    for (const row of rows) {
      const key = row.authMethod === 'email' || row.authMethod === 'phone' || row.authMethod === 'vk' ? row.authMethod : 'other';
      result[key] += Number(row.valueTotal);
    }

    return result;
  }

  async getRequestTypes(query: GetRequestTypesQueryDto) {
    const rows = await this.statsReportRepository.getRequestTypeRows(query);
    return rows.map((row) => ({ requestType: row.requestType, valueTotal: Number(row.valueTotal) }));
  }
}
