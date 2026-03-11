import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { StatEventWriteRepository } from './repositories/stat-event-write.repository';
import { StatsIngestService } from './stats-ingest.service';

describe('StatsIngestService', () => {
  let service: StatsIngestService;
  const repositoryMock = {
    insertIgnore: jest.fn(),
  };

  beforeEach(async () => {
    repositoryMock.insertIgnore.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsIngestService,
        {
          provide: StatEventWriteRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<StatsIngestService>(StatsIngestService);
  });

  it('returns duplicate=false when repository inserts new event', async () => {
    repositoryMock.insertIgnore.mockResolvedValue(false);

    const result = await service.ingestEvent({
      eventUuid: '7d3745a4-6de5-470a-84d2-7f1496ecd303',
      eventName: 'auth.login.success',
      eventCategory: 'auth',
      occurredAt: '2026-03-11T10:00:00.000Z',
      organizationId: 1,
      isSuccess: true,
      sourceSystem: 'lka-monolith',
    });

    expect(result).toEqual({ accepted: true, duplicate: false, eventUuid: '7d3745a4-6de5-470a-84d2-7f1496ecd303' });
  });

  it('throws BadRequestException for forbidden payload keys', async () => {
    await expect(
      service.ingestEvent({
        eventUuid: '7d3745a4-6de5-470a-84d2-7f1496ecd303',
        eventName: 'payment.success',
        eventCategory: 'payment',
        occurredAt: '2026-03-11T10:00:00.000Z',
        organizationId: 1,
        isSuccess: true,
        sourceSystem: 'lka-monolith',
        payload: { nested: { paymentToken: 'x' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
