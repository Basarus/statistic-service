import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StatAggregateDailyEntity } from '../../../database/entities/stat-aggregate-daily.entity';
import { StatAggregateMonthlyEntity } from '../../../database/entities/stat-aggregate-monthly.entity';
import { GetAuthMethodsQueryDto } from '../dto/get-auth-methods-query.dto';
import { GetMetricsQueryDto } from '../dto/get-metrics-query.dto';
import { GetRequestTypesQueryDto } from '../dto/get-request-types-query.dto';

@Injectable()
export class StatsReportRepository {
  constructor(
    @InjectRepository(StatAggregateDailyEntity)
    private readonly dailyRepository: Repository<StatAggregateDailyEntity>,
    @InjectRepository(StatAggregateMonthlyEntity)
    private readonly monthlyRepository: Repository<StatAggregateMonthlyEntity>,
  ) {}

  getCurrentMonthRows(organizationId: number, year: number, month: number) {
    return this.monthlyRepository
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
      .getRawMany() as Promise<Array<{ metricCode: string; platform: string | null; valueTotal: string; valueUniqueUsers: string }>>;
  }

  getAuthMethodRows(query: GetAuthMethodsQueryDto) {
    return this.dailyRepository
      .createQueryBuilder('d')
      .select('COALESCE(d.dimensionAuthMethod, :other)', 'authMethod')
      .addSelect('SUM(d.valueTotal)::bigint', 'valueTotal')
      .where('d.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('d.metricCode = :metricCode', { metricCode: 'login_by_auth_method' })
      .andWhere('d.date BETWEEN :dateFrom AND :dateTo', { dateFrom: query.dateFrom, dateTo: query.dateTo })
      .setParameter('other', 'other')
      .groupBy('d.dimensionAuthMethod')
      .getRawMany() as Promise<Array<{ authMethod: string; valueTotal: string }>>;
  }

  getRequestTypeRows(query: GetRequestTypesQueryDto) {
    return this.dailyRepository
      .createQueryBuilder('d')
      .select('COALESCE(d.dimensionRequestType, :unknown)', 'requestType')
      .addSelect('SUM(d.valueTotal)::bigint', 'valueTotal')
      .where('d.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('d.metricCode IN (:...metricCodes)', { metricCodes: ['request_sent_lka', 'request_sent_provider'] })
      .andWhere('d.date BETWEEN :dateFrom AND :dateTo', { dateFrom: query.dateFrom, dateTo: query.dateTo })
      .setParameter('unknown', 'unknown')
      .groupBy('d.dimensionRequestType')
      .orderBy('valueTotal', 'DESC')
      .getRawMany() as Promise<Array<{ requestType: string; valueTotal: string }>>;
  }

  getDailyMetricsRows(query: GetMetricsQueryDto) {
    const qb = this.dailyRepository
      .createQueryBuilder('d')
      .select('d.date', 'period')
      .addSelect('SUM(d.valueTotal)::bigint', 'valueTotal')
      .addSelect('SUM(d.valueUniqueUsers)::bigint', 'valueUniqueUsers')
      .addSelect('SUM(d.valueUniqueAccounts)::bigint', 'valueUniqueAccounts')
      .where('d.metricCode = :metricCode', { metricCode: query.metricCode })
      .andWhere('d.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('d.date BETWEEN :dateFrom AND :dateTo', { dateFrom: query.dateFrom, dateTo: query.dateTo })
      .groupBy('d.date')
      .orderBy('d.date', 'ASC');

    if (query.platform) qb.andWhere('d.dimensionPlatform = :platform', { platform: query.platform });
    if (query.authMethod) qb.andWhere('d.dimensionAuthMethod = :authMethod', { authMethod: query.authMethod });
    if (query.requestType) qb.andWhere('d.dimensionRequestType = :requestType', { requestType: query.requestType });
    if (query.providerId !== undefined) qb.andWhere('d.dimensionProviderId = :providerId', { providerId: query.providerId });

    return qb.getRawMany() as Promise<Array<{ period: string; valueTotal: string; valueUniqueUsers: string; valueUniqueAccounts: string }>>;
  }

  getMonthlyMetricsRows(query: GetMetricsQueryDto, fromYm: number, toYm: number) {
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

    if (query.platform) qb.andWhere('m.dimensionPlatform = :platform', { platform: query.platform });
    if (query.authMethod) qb.andWhere('m.dimensionAuthMethod = :authMethod', { authMethod: query.authMethod });
    if (query.requestType) qb.andWhere('m.dimensionRequestType = :requestType', { requestType: query.requestType });
    if (query.providerId !== undefined) qb.andWhere('m.dimensionProviderId = :providerId', { providerId: query.providerId });

    return qb.getRawMany() as Promise<Array<{ period: string; valueTotal: string; valueUniqueUsers: string; valueUniqueAccounts: string }>>;
  }
}
