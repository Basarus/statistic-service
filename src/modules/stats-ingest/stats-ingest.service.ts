import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StatEventEntity } from '../../database/entities/stat-event.entity';
import { CreateStatEventDto } from './dto/create-stat-event.dto';

@Injectable()
export class StatsIngestService {
  constructor(
    @InjectRepository(StatEventEntity)
    private readonly statEventRepository: Repository<StatEventEntity>,
  ) {}

  async ingestEvent(dto: CreateStatEventDto) {
    const occurredAt = new Date(dto.occurredAt);

    const values: Partial<StatEventEntity> = {
      eventUuid: dto.eventUuid,
      eventName: dto.eventName,
      eventCategory: dto.eventCategory,
      occurredAt,
      receivedAt: new Date(),
      year: occurredAt.getUTCFullYear(),
      month: occurredAt.getUTCMonth() + 1,
      day: occurredAt.getUTCDate(),
      hour: occurredAt.getUTCHours(),
      organizationId: dto.organizationId,
      userId: dto.userId ?? null,
      accountId: null,
      personalAccountId: dto.personalAccountId ?? null,
      platform: dto.platform ?? null,
      authMethod: dto.authMethod ?? null,
      requestType: dto.requestType ?? null,
      providerId: dto.providerId ?? null,
      serviceType: dto.serviceType ?? null,
      isSuccess: dto.isSuccess,
      payload: (dto.payload ?? {}) as Record<string, unknown>,
      sourceSystem: dto.sourceSystem,
    };

    const result = await this.statEventRepository
      .createQueryBuilder()
      .insert()
      .into(StatEventEntity)
      .values(values as never)
      .orIgnore()
      .execute();

    const isDuplicate = result.identifiers.length === 0;

    return {
      accepted: true,
      duplicate: isDuplicate,
      eventUuid: dto.eventUuid,
    };
  }
}
