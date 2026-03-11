import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { StatJobStateEntity } from '../../database/entities/stat-job-state.entity';
import { StatsAggregateService } from './stats-aggregate.service';

describe('StatsAggregateService', () => {
  let service: StatsAggregateService;
  let dataSourceMock: { query: jest.Mock };
  let jobStateRepositoryMock: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    dataSourceMock = {
      query: jest.fn(),
    };

    jobStateRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsAggregateService,
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: number) => {
              if (key === 'aggregation.rawToDailyBatchSize') {
                return 10;
              }
              if (key === 'aggregation.dailyToMonthlyBatchSize') {
                return 10;
              }
              if (key === 'aggregation.rawEventsTtlDays') {
                return 45;
              }
              return defaultValue;
            },
          },
        },
        {
          provide: getRepositoryToken(StatJobStateEntity),
          useValue: jobStateRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<StatsAggregateService>(StatsAggregateService);
  });

  it('updates raw_to_daily state when source rows are processed', async () => {
    jobStateRepositoryMock.findOne.mockResolvedValue({
      id: 'state-id',
      jobName: 'raw_to_daily',
      lastProcessedAt: null,
      lastProcessedId: null,
    });

    dataSourceMock.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          max_occurred_at: '2026-03-11T12:30:00.000Z',
          max_event_id: '4f5f57fe-f386-4f45-8c4e-e190897f20ab',
          processed_count: 5,
        },
      ]);

    await service.runRawToDailyAggregation();

    expect(jobStateRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: 'raw_to_daily',
        lastProcessedId: '4f5f57fe-f386-4f45-8c4e-e190897f20ab',
      }),
    );
    expect(dataSourceMock.query).toHaveBeenCalledTimes(2);
  });

  it('rebuilds monthly aggregates for changed months and updates state', async () => {
    jobStateRepositoryMock.findOne.mockResolvedValue({
      id: 'state-id',
      jobName: 'daily_to_monthly',
      lastProcessedAt: new Date('2026-03-01T00:00:00.000Z'),
      lastProcessedId: null,
    });

    dataSourceMock.query
      .mockResolvedValueOnce([{ year: 2026, month: 3 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ max_updated_at: '2026-03-11T23:30:00.000Z' }]);

    await service.runDailyToMonthlyAggregation();

    expect(dataSourceMock.query).toHaveBeenCalledTimes(4);
    expect(jobStateRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: 'daily_to_monthly',
      }),
    );
  });

  it('deletes raw events older than configured ttl', async () => {
    dataSourceMock.query.mockResolvedValue([]);

    await service.cleanupRawEvents();

    expect(dataSourceMock.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM stat_event'), [45]);
  });
});
