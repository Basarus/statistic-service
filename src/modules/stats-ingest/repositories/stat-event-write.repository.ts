import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StatEventEntity } from '../../../database/entities/stat-event.entity';

@Injectable()
export class StatEventWriteRepository {
  constructor(
    @InjectRepository(StatEventEntity)
    private readonly statEventRepository: Repository<StatEventEntity>,
  ) {}

  async insertIgnore(values: Partial<StatEventEntity>): Promise<boolean> {
    const result = await this.statEventRepository
      .createQueryBuilder()
      .insert()
      .into(StatEventEntity)
      .values(values as never)
      .orIgnore()
      .execute();

    return result.identifiers.length === 0;
  }
}
