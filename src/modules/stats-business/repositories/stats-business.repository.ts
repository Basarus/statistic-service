import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { StatBusinessSnapshotEntity } from '../../../database/entities/stat-business-snapshot.entity';

@Injectable()
export class StatsBusinessRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StatBusinessSnapshotEntity)
    private readonly snapshotRepository: Repository<StatBusinessSnapshotEntity>,
  ) {}

  upsertSnapshot(params: {
    snapshotDate: string;
    organizationId: number;
    metricCode: string;
    dimensionKey: string | null;
    valueTotal: number;
    payload: Record<string, unknown> | null;
  }): Promise<void> {
    return this.dataSource
      .query(
        `
      INSERT INTO stat_business_snapshot (
        snapshot_date, organization_id, metric_code, dimension_key, value_total, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (snapshot_date, organization_id, metric_code, (COALESCE(dimension_key, '')))
      DO UPDATE SET value_total = EXCLUDED.value_total, payload = EXCLUDED.payload, created_at = now()
      `,
        [params.snapshotDate, params.organizationId, params.metricCode, params.dimensionKey, params.valueTotal, params.payload],
      )
      .then(() => undefined);
  }

  async findSnapshots(query: {
    organizationId: number;
    metricCode: string;
    dateFrom: string;
    dateTo: string;
    dimensionKey?: string;
  }) {
    const qb = this.snapshotRepository
      .createQueryBuilder('s')
      .select('s.snapshotDate', 'snapshotDate')
      .addSelect('s.metricCode', 'metricCode')
      .addSelect('s.dimensionKey', 'dimensionKey')
      .addSelect('s.valueTotal', 'valueTotal')
      .addSelect('s.payload', 'payload')
      .where('s.organizationId = :organizationId', { organizationId: query.organizationId })
      .andWhere('s.metricCode = :metricCode', { metricCode: query.metricCode })
      .andWhere('s.snapshotDate BETWEEN :dateFrom AND :dateTo', { dateFrom: query.dateFrom, dateTo: query.dateTo })
      .orderBy('s.snapshotDate', 'ASC');

    if (query.dimensionKey) qb.andWhere('s.dimensionKey = :dimensionKey', { dimensionKey: query.dimensionKey });

    return (await qb.getRawMany()) as Array<{
      snapshotDate: string;
      metricCode: string;
      dimensionKey: string | null;
      valueTotal: string;
      payload: Record<string, unknown> | null;
    }>;
  }

  getConversionRows(organizationId: number, dateFrom: string, dateTo: string) {
    return this.dataSource.query(
      `
      SELECT event_name, COUNT(DISTINCT user_id)::bigint AS users
      FROM stat_event
      WHERE organization_id = $1 AND occurred_at >= $2 AND occurred_at <= $3
        AND user_id IS NOT NULL
        AND event_name IN ('user.created', 'account.linked', 'auth.login.success', 'payment.success')
      GROUP BY event_name
      `,
      [organizationId, dateFrom, dateTo],
    ) as Promise<Array<{ event_name: string; users: string }>>;
  }

  getLatestInactiveUsers(organizationId: number) {
    return this.snapshotRepository
      .createQueryBuilder('s')
      .select('s.snapshotDate', 'snapshotDate')
      .addSelect('s.valueTotal', 'valueTotal')
      .where('s.organizationId = :organizationId', { organizationId })
      .andWhere('s.metricCode = :metricCode', { metricCode: 'users_inactive_6m' })
      .orderBy('s.snapshotDate', 'DESC')
      .addOrderBy('s.createdAt', 'DESC')
      .limit(1)
      .getRawOne() as Promise<{ snapshotDate: string; valueTotal: string } | null>;
  }

  buildInactiveUsersSnapshot(): Promise<void> {
    return this.dataSource
      .query(`
        INSERT INTO stat_business_snapshot (snapshot_date, organization_id, metric_code, dimension_key, value_total, payload, created_at)
        SELECT now()::date, organization_id, 'users_inactive_6m', null, COUNT(*)::bigint, null, now()
        FROM (
          SELECT organization_id, user_id, MAX(occurred_at) AS last_activity
          FROM stat_event
          WHERE user_id IS NOT NULL
          GROUP BY organization_id, user_id
        ) x
        WHERE last_activity < now() - interval '6 months'
        GROUP BY organization_id
        ON CONFLICT (snapshot_date, organization_id, metric_code, (COALESCE(dimension_key, '')))
        DO UPDATE SET value_total = EXCLUDED.value_total, payload = EXCLUDED.payload, created_at = now()
      `)
      .then(() => undefined);
  }

  buildPaymentTypeSnapshot(): Promise<void> {
    return this.dataSource
      .query(`
        INSERT INTO stat_business_snapshot (snapshot_date, organization_id, metric_code, dimension_key, value_total, payload, created_at)
        SELECT now()::date, organization_id, 'payment_type_count', COALESCE(payload->>'paymentType', 'unknown'), COUNT(*)::bigint, null, now()
        FROM stat_event
        WHERE event_name = 'payment.success' AND occurred_at >= date_trunc('day', now())
        GROUP BY organization_id, COALESCE(payload->>'paymentType', 'unknown')
        ON CONFLICT (snapshot_date, organization_id, metric_code, (COALESCE(dimension_key, '')))
        DO UPDATE SET value_total = EXCLUDED.value_total, payload = EXCLUDED.payload, created_at = now()
      `)
      .then(() => undefined);
  }

  buildAuthMethodSnapshot(): Promise<void> {
    return this.dataSource
      .query(`
        INSERT INTO stat_business_snapshot (snapshot_date, organization_id, metric_code, dimension_key, value_total, payload, created_at)
        SELECT now()::date, organization_id, 'auth_method_count', COALESCE(auth_method, 'other'), COUNT(*)::bigint, null, now()
        FROM stat_event
        WHERE event_name IN ('auth.login.success', 'auth.login.failed') AND occurred_at >= date_trunc('day', now())
        GROUP BY organization_id, COALESCE(auth_method, 'other')
        ON CONFLICT (snapshot_date, organization_id, metric_code, (COALESCE(dimension_key, '')))
        DO UPDATE SET value_total = EXCLUDED.value_total, payload = EXCLUDED.payload, created_at = now()
      `)
      .then(() => undefined);
  }
}
