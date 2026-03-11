import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GetBusinessSnapshotsQueryDto } from './dto/get-business-snapshots-query.dto';
import { GetConversionQueryDto } from './dto/get-conversion-query.dto';
import { UpsertBusinessSnapshotDto } from './dto/upsert-business-snapshot.dto';
import { StatsBusinessRepository } from './repositories/stats-business.repository';

@Injectable()
export class StatsBusinessService {
  private readonly logger = new Logger(StatsBusinessService.name);

  constructor(private readonly statsBusinessRepository: StatsBusinessRepository) {}

  async upsertSnapshot(dto: UpsertBusinessSnapshotDto) {
    await this.statsBusinessRepository.upsertSnapshot({
      snapshotDate: dto.snapshotDate,
      organizationId: dto.organizationId,
      metricCode: dto.metricCode,
      dimensionKey: dto.dimensionKey ?? null,
      valueTotal: dto.valueTotal,
      payload: dto.payload ?? null,
    });
    return { accepted: true };
  }

  async getSnapshots(query: GetBusinessSnapshotsQueryDto) {
    const rows = await this.statsBusinessRepository.findSnapshots(query);
    return rows.map((row) => ({
      snapshotDate: row.snapshotDate,
      metricCode: row.metricCode,
      dimensionKey: row.dimensionKey,
      valueTotal: Number(row.valueTotal),
      payload: row.payload,
    }));
  }

  async getConversion(query: GetConversionQueryDto) {
    const rows = await this.statsBusinessRepository.getConversionRows(query.organizationId, query.dateFrom, query.dateTo);
    const toNumber = (eventName: string) => Number(rows.find((row) => row.event_name === eventName)?.users ?? 0);
    return {
      registeredUsers: toNumber('user.created'),
      linkedAccountsUsers: toNumber('account.linked'),
      loggedInUsers: toNumber('auth.login.success'),
      paidUsers: toNumber('payment.success'),
    };
  }

  async getLatestInactiveUsers(organizationId: number) {
    const row = await this.statsBusinessRepository.getLatestInactiveUsers(organizationId);
    return {
      snapshotDate: row?.snapshotDate ?? null,
      inactiveUsers: Number(row?.valueTotal ?? 0),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async buildInactiveUsersSnapshot(): Promise<void> {
    try {
      await this.statsBusinessRepository.buildInactiveUsersSnapshot();
      this.logger.log('users_inactive_6m snapshot built');
    } catch (error) {
      this.logger.error('users_inactive_6m snapshot failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async buildPaymentTypeSnapshot(): Promise<void> {
    try {
      await this.statsBusinessRepository.buildPaymentTypeSnapshot();
      this.logger.log('payment_type_count snapshot built');
    } catch (error) {
      this.logger.error('payment_type_count snapshot failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async buildAuthMethodSnapshot(): Promise<void> {
    try {
      await this.statsBusinessRepository.buildAuthMethodSnapshot();
      this.logger.log('auth_method_count snapshot built');
    } catch (error) {
      this.logger.error('auth_method_count snapshot failed', error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}
