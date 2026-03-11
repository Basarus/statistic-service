import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StatAggregateDailyEntity } from '../../database/entities/stat-aggregate-daily.entity';
import { StatAggregateMonthlyEntity } from '../../database/entities/stat-aggregate-monthly.entity';
import { GetAuthMethodsQueryDto } from './dto/get-auth-methods-query.dto';
import { MetricsGroupBy, GetMetricsQueryDto } from './dto/get-metrics-query.dto';
import { GetRequestTypesQueryDto } from './dto/get-request-types-query.dto';

@Injectable()
export class StatsReportService {
  constructor(
    @InjectRepository(StatAggregateDailyEntity)
    private readonly dailyRepository: Repository<StatAggregateDailyEntity>,
    @InjectRepository(StatAggregateMonthlyEntity)
    private readonly monthlyRepository: Repository<StatAggregateMonthlyEntity>,
  ) {}

  async getMetrics(query: GetMetricsQueryDto) {
    if (query.groupBy === MetricsGroupBy.DAY) {
      return this.getDailyMetrics(query);
    }

    return this.getMonthlyMetrics(query);
  }

  async getCurrentMonthWidget(organizationId: number) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const rows = (await this.monthlyRepository
      .createQueryBuilder('m')
      .select('m.metricCode', 'metricCode')
      .addSelect('m.dimensionPlatform', 'platform')
      .addSelect('SUM(m.valueTotal)::bigint', 'valueTotal')
      .addSelect('SUM(m.valueUniqueUsers)::bigint', 'valueUniqueUsers')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.year = :year', { year })
      .andWhere('m.month = :month', { month })
      .groupBy('m.metricCode')
      .addGroupBy('m.dimensionPlatform')
      .getRawMany()) as Array<{
      metricCode: string;
      platform: string | null;
      valueTotal: string;
      valueUniqueUsers: string;
    }>;

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
    const rows = (await this.dailyRepository
      .createQueryBuilder('d')
      .select('COALESCE(d.dimensionAuthMethod, :other)', 'authMethod')
      .addSelect('SUM(d.valueTotal)::bigint', 'valueTotal')
      .where('d.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('d.metricCode = :metricCode', { metricCode: 'login_by_auth_method' })
      .andWhere('d.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
      .setParameter('other', 'other')
      .groupBy('d.dimensionAuthMethod')
      .getRawMany()) as Array<{ authMethod: string; valueTotal: string }>;

    const result = {
      email: 0,
      phone: 0,
      vk: 0,
      other: 0,
    };

    for (const row of rows) {
      const key = row.authMethod === 'email' || row.authMethod === 'phone' || row.authMethod === 'vk' ? row.authMethod : 'other';
      result[key] += Number(row.valueTotal);
    }

    return result;
  }

  async getRequestTypes(query: GetRequestTypesQueryDto) {
    const rows = (await this.dailyRepository
      .createQueryBuilder('d')
      .select('COALESCE(d.dimensionRequestType, :unknown)', 'requestType')
      .addSelect('SUM(d.valueTotal)::bigint', 'valueTotal')
      .where('d.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('d.metricCode IN (:...metricCodes)', {
        metricCodes: ['request_sent_lka', 'request_sent_provider'],
      })
      .andWhere('d.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
      .setParameter('unknown', 'unknown')
      .groupBy('d.dimensionRequestType')
      .orderBy('valueTotal', 'DESC')
      .getRawMany()) as Array<{ requestType: string; valueTotal: string }>;

    return rows.map((row) => ({
      requestType: row.requestType,
      valueTotal: Number(row.valueTotal),
    }));
  }

  private async getDailyMetrics(query: GetMetricsQueryDto) {
    const qb = this.dailyRepository
      .createQueryBuilder('d')
      .select('d.date', 'period')
      .addSelect('SUM(d.valueTotal)::bigint', 'valueTotal')
      .addSelect('SUM(d.valueUniqueUsers)::bigint', 'valueUniqueUsers')
      .addSelect('SUM(d.valueUniqueAccounts)::bigint', 'valueUniqueAccounts')
      .where('d.metricCode = :metricCode', { metricCode: query.metricCode })
      .andWhere('d.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('d.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
      .groupBy('d.date')
      .orderBy('d.date', 'ASC');

    if (query.platform) {
      qb.andWhere('d.dimensionPlatform = :platform', { platform: query.platform });
    }
    if (query.authMethod) {
      qb.andWhere('d.dimensionAuthMethod = :authMethod', { authMethod: query.authMethod });
    }
    if (query.requestType) {
      qb.andWhere('d.dimensionRequestType = :requestType', { requestType: query.requestType });
    }
    if (query.providerId !== undefined) {
      qb.andWhere('d.dimensionProviderId = :providerId', { providerId: query.providerId });
    }

    const rows = (await qb.getRawMany()) as Array<{
      period: string;
      valueTotal: string;
      valueUniqueUsers: string;
      valueUniqueAccounts: string;
    }>;

    return rows.map((row) => ({
      period: row.period,
      valueTotal: Number(row.valueTotal),
      valueUniqueUsers: Number(row.valueUniqueUsers),
      valueUniqueAccounts: Number(row.valueUniqueAccounts),
    }));
  }

  private async getMonthlyMetrics(query: GetMetricsQueryDto) {
    const from = new Date(query.dateFrom);
    const to = new Date(query.dateTo);
    const fromYm = from.getUTCFullYear() * 100 + (from.getUTCMonth() + 1);
    const toYm = to.getUTCFullYear() * 100 + (to.getUTCMonth() + 1);

    const qb = this.monthlyRepository
      .createQueryBuilder('m')
      .select("concat(m.year::text, '-', lpad(m.month::text, 2, '0'))", 'period')
      .addSelect('SUM(m.valueTotal)::bigint', 'valueTotal')
      .addSelect('SUM(m.valueUniqueUsers)::bigint', 'valueUniqueUsers')
      .addSelect('SUM(m.valueUniqueAccounts)::bigint', 'valueUniqueAccounts')
      .where('m.metricCode = :metricCode', { metricCode: query.metricCode })
      .andWhere('m.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('(m.year * 100 + m.month) BETWEEN :fromYm AND :toYm', { fromYm, toYm })
      .groupBy('m.year')
      .addGroupBy('m.month')
      .orderBy('m.year', 'ASC')
      .addOrderBy('m.month', 'ASC');

    if (query.platform) {
      qb.andWhere('m.dimensionPlatform = :platform', { platform: query.platform });
    }
    if (query.authMethod) {
      qb.andWhere('m.dimensionAuthMethod = :authMethod', { authMethod: query.authMethod });
    }
    if (query.requestType) {
      qb.andWhere('m.dimensionRequestType = :requestType', { requestType: query.requestType });
    }
    if (query.providerId !== undefined) {
      qb.andWhere('m.dimensionProviderId = :providerId', { providerId: query.providerId });
    }

    const rows = (await qb.getRawMany()) as Array<{
      period: string;
      valueTotal: string;
      valueUniqueUsers: string;
      valueUniqueAccounts: string;
    }>;

    return rows.map((row) => ({
      period: row.period,
      valueTotal: Number(row.valueTotal),
      valueUniqueUsers: Number(row.valueUniqueUsers),
      valueUniqueAccounts: Number(row.valueUniqueAccounts),
    }));
  }
}
