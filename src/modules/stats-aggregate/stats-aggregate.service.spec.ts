import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';

import { StatJobStateEntity } from '../../database/entities/stat-job-state.entity';
import { StatsAggregateRepository } from './repositories/stats-aggregate.repository';
import { StatsAggregateService } from './stats-aggregate.service';

describe('StatsAggregateService', () => {
  let service: StatsAggregateService;
  let repositoryMock: Record<string, jest.Mock>;
  let jobStateRepositoryMock: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repositoryMock = {
      upsertRawToDaily: jest.fn(),
      getRawCursor: jest.fn(),
      getChangedMonths: jest.fn(),
      rebuildMonthlySlice: jest.fn(),
      getMaxDailyUpdatedAt: jest.fn(),
      deleteRawBefore: jest.fn(),
    };

    jobStateRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsAggregateService,
        { provide: StatsAggregateRepository, useValue: repositoryMock },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: number) => {
              if (key === 'aggregation.rawToDailyBatchSize') return 10;
              if (key === 'aggregation.dailyToMonthlyBatchSize') return 10;
              if (key === 'aggregation.rawEventsTtlDays') return 45;
              return defaultValue;
            },
          },
        },
        { provide: getRepositoryToken(StatJobStateEntity), useValue: jobStateRepositoryMock },
      ],
    }).compile();

    service = module.get<StatsAggregateService>(StatsAggregateService);
  });

  it('updates raw_to_daily state when source rows are processed', async () => {
    jobStateRepositoryMock.findOne.mockResolvedValue({ jobName: 'raw_to_daily', lastProcessedAt: null, lastProcessedId: null });
    repositoryMock.getRawCursor.mockResolvedValue({
      max_occurred_at: '2026-03-11T12:30:00.000Z',
      max_event_id: '4f5f57fe-f386-4f45-8c4e-e190897f20ab',
      processed_count: 5,
    });

    await service.runRawToDailyAggregation();

    expect(repositoryMock.upsertRawToDaily).toHaveBeenCalled();
    expect(jobStateRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ lastProcessedId: '4f5f57fe-f386-4f45-8c4e-e190897f20ab' }),
    );
  });

  it('rebuilds monthly aggregates for changed months and updates state', async () => {
    jobStateRepositoryMock.findOne.mockResolvedValue({ jobName: 'daily_to_monthly', lastProcessedAt: new Date('2026-03-01T00:00:00.000Z') });
    repositoryMock.getChangedMonths.mockResolvedValue([{ year: 2026, month: 3 }]);
    repositoryMock.getMaxDailyUpdatedAt.mockResolvedValue('2026-03-11T23:30:00.000Z');

    await service.runDailyToMonthlyAggregation();

    expect(repositoryMock.rebuildMonthlySlice).toHaveBeenCalledWith(2026, 3);
    expect(jobStateRepositoryMock.save).toHaveBeenCalled();
  });

  it('deletes raw events older than configured ttl', async () => {
    await service.cleanupRawEvents();
    expect(repositoryMock.deleteRawBefore).toHaveBeenCalledWith(45);
  });
});
