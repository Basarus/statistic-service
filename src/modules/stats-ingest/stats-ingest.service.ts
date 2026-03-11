import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StatEventEntity } from '../../database/entities/stat-event.entity';
import { CreateStatEventDto } from './dto/create-stat-event.dto';

@Injectable()
export class StatsIngestService {
  private readonly forbiddenPayloadKeyPatterns = ['password', 'token', 'secret', 'card', 'pan', 'cvv'];

  constructor(
    @InjectRepository(StatEventEntity)
    private readonly statEventRepository: Repository<StatEventEntity>,
  ) {}

  async ingestEvent(dto: CreateStatEventDto) {
    this.assertPayloadSafety(dto.payload);

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

  private assertPayloadSafety(payload?: Record<string, unknown>): void {
    if (!payload) {
      return;
    }

    const queue: Array<Record<string, unknown>> = [payload];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      for (const [key, value] of Object.entries(current)) {
        const normalizedKey = key.toLowerCase();

        if (this.forbiddenPayloadKeyPatterns.some((pattern) => normalizedKey.includes(pattern))) {
          throw new BadRequestException(`Payload key \"${key}\" is not allowed`);
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          queue.push(value as Record<string, unknown>);
        }
      }
    }
  }
}
