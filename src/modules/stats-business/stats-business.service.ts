import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { StatBusinessSnapshotEntity } from '../../database/entities/stat-business-snapshot.entity';
import { GetBusinessSnapshotsQueryDto } from './dto/get-business-snapshots-query.dto';
import { GetConversionQueryDto } from './dto/get-conversion-query.dto';
import { UpsertBusinessSnapshotDto } from './dto/upsert-business-snapshot.dto';

@Injectable()
export class StatsBusinessService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StatBusinessSnapshotEntity)
    private readonly snapshotRepository: Repository<StatBusinessSnapshotEntity>,
  ) {}

  async upsertSnapshot(dto: UpsertBusinessSnapshotDto) {
    await this.snapshotRepository
      .createQueryBuilder()
      .insert()
      .into(StatBusinessSnapshotEntity)
      .values({
        snapshotDate: dto.snapshotDate,
        organizationId: dto.organizationId,
        metricCode: dto.metricCode,
        dimensionKey: dto.dimensionKey ?? null,
        valueTotal: String(dto.valueTotal),
        payload: dto.payload ?? null,
      } as never)
      .execute();

    return { accepted: true };
  }

  async getSnapshots(query: GetBusinessSnapshotsQueryDto) {
    const qb = this.snapshotRepository
      .createQueryBuilder('s')
      .select('s.snapshotDate', 'snapshotDate')
      .addSelect('s.metricCode', 'metricCode')
      .addSelect('s.dimensionKey', 'dimensionKey')
      .addSelect('s.valueTotal', 'valueTotal')
      .addSelect('s.payload', 'payload')
      .where('s.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('s.metricCode = :metricCode', { metricCode: query.metricCode })
      .andWhere('s.snapshotDate BETWEEN :dateFrom AND :dateTo', {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
      .orderBy('s.snapshotDate', 'ASC');

    if (query.dimensionKey) {
      qb.andWhere('s.dimensionKey = :dimensionKey', { dimensionKey: query.dimensionKey });
    }

    const rows = (await qb.getRawMany()) as Array<{
      snapshotDate: string;
      metricCode: string;
      dimensionKey: string | null;
      valueTotal: string;
      payload: Record<string, unknown> | null;
    }>;

    return rows.map((row) => ({
      snapshotDate: row.snapshotDate,
      metricCode: row.metricCode,
      dimensionKey: row.dimensionKey,
      valueTotal: Number(row.valueTotal),
      payload: row.payload,
    }));
  }

  async getConversion(query: GetConversionQueryDto) {
    const rows = (await this.dataSource.query(
      `
      SELECT event_name, COUNT(DISTINCT user_id)::bigint AS users
      FROM stat_event
      WHERE organization_id = $1
        AND occurred_at >= $2
        AND occurred_at <= $3
        AND user_id IS NOT NULL
        AND event_name IN ('user.created', 'account.linked', 'auth.login.success', 'payment.success')
      GROUP BY event_name
      `,
      [query.organizationId, query.dateFrom, query.dateTo],
    )) as Array<{ event_name: string; users: string }>;

    const toNumber = (eventName: string) => Number(rows.find((row) => row.event_name === eventName)?.users ?? 0);

    return {
      registeredUsers: toNumber('user.created'),
      linkedAccountsUsers: toNumber('account.linked'),
      loggedInUsers: toNumber('auth.login.success'),
      paidUsers: toNumber('payment.success'),
    };
  }

  async getLatestInactiveUsers(organizationId: number) {
    const row = (await this.snapshotRepository
      .createQueryBuilder('s')
      .select('s.snapshotDate', 'snapshotDate')
      .addSelect('s.valueTotal', 'valueTotal')
      .where('s.organizationId = :organizationId', { organizationId })
      .andWhere('s.metricCode = :metricCode', { metricCode: 'users_inactive_6m' })
      .orderBy('s.snapshotDate', 'DESC')
      .addOrderBy('s.createdAt', 'DESC')
      .limit(1)
      .getRawOne()) as { snapshotDate: string; valueTotal: string } | null;

    return {
      snapshotDate: row?.snapshotDate ?? null,
      inactiveUsers: Number(row?.valueTotal ?? 0),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async buildInactiveUsersSnapshot(): Promise<void> {
    await this.dataSource.query(`
      INSERT INTO stat_business_snapshot (
        snapshot_date,
        organization_id,
        metric_code,
        dimension_key,
        value_total,
        payload,
        created_at
      )
      SELECT
        now()::date,
        organization_id,
        'users_inactive_6m',
        null,
        COUNT(*)::bigint,
        null,
        now()
      FROM (
        SELECT organization_id, user_id, MAX(occurred_at) AS last_activity
        FROM stat_event
        WHERE user_id IS NOT NULL
        GROUP BY organization_id, user_id
      ) x
      WHERE last_activity < now() - interval '6 months'
      GROUP BY organization_id
    `);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async buildPaymentTypeSnapshot(): Promise<void> {
    await this.dataSource.query(`
      INSERT INTO stat_business_snapshot (
        snapshot_date,
        organization_id,
        metric_code,
        dimension_key,
        value_total,
        payload,
        created_at
      )
      SELECT
        now()::date,
        organization_id,
        'payment_type_count',
        COALESCE(payload->>'paymentType', 'unknown'),
        COUNT(*)::bigint,
        null,
        now()
      FROM stat_event
      WHERE event_name = 'payment.success'
        AND occurred_at >= date_trunc('day', now())
      GROUP BY organization_id, COALESCE(payload->>'paymentType', 'unknown')
    `);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async buildAuthMethodSnapshot(): Promise<void> {
    await this.dataSource.query(`
      INSERT INTO stat_business_snapshot (
        snapshot_date,
        organization_id,
        metric_code,
        dimension_key,
        value_total,
        payload,
        created_at
      )
      SELECT
        now()::date,
        organization_id,
        'auth_method_count',
        COALESCE(auth_method, 'other'),
        COUNT(*)::bigint,
        null,
        now()
      FROM stat_event
      WHERE event_name IN ('auth.login.success', 'auth.login.failed')
        AND occurred_at >= date_trunc('day', now())
      GROUP BY organization_id, COALESCE(auth_method, 'other')
    `);
  }
}
