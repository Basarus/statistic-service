import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { StatBusinessSnapshotEntity } from '../../database/entities/stat-business-snapshot.entity';
import { StatsBusinessService } from './stats-business.service';

describe('StatsBusinessService', () => {
  let service: StatsBusinessService;
  const dataSourceMock = { query: jest.fn() };
  const repositoryMock = {
    createQueryBuilder: jest.fn(),
    insert: jest.fn(),
    into: jest.fn(),
    values: jest.fn(),
    execute: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    limit: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    dataSourceMock.query.mockReset();
    for (const key of Object.keys(repositoryMock)) {
      (repositoryMock as Record<string, jest.Mock>)[key].mockReset();
      (repositoryMock as Record<string, jest.Mock>)[key].mockReturnValue(repositoryMock);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsBusinessService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(StatBusinessSnapshotEntity), useValue: repositoryMock },
      ],
    }).compile();

    service = module.get<StatsBusinessService>(StatsBusinessService);
  });

  it('builds inactive users snapshot via SQL projection', async () => {
    dataSourceMock.query.mockResolvedValue([]);

    await service.buildInactiveUsersSnapshot();

    expect(dataSourceMock.query).toHaveBeenCalledWith(expect.stringContaining('users_inactive_6m'));
  });

  it('builds payment type snapshot via SQL projection', async () => {
    dataSourceMock.query.mockResolvedValue([]);

    await service.buildPaymentTypeSnapshot();

    expect(dataSourceMock.query).toHaveBeenCalledWith(expect.stringContaining('payment_type_count'));
  });

  it('returns conversion response', async () => {
    dataSourceMock.query.mockResolvedValue([
      { event_name: 'user.created', users: '10' },
      { event_name: 'account.linked', users: '7' },
      { event_name: 'auth.login.success', users: '6' },
      { event_name: 'payment.success', users: '3' },
    ]);

    await expect(
      service.getConversion({ organizationId: 10, dateFrom: '2026-03-01', dateTo: '2026-03-31' }),
    ).resolves.toEqual({
      registeredUsers: 10,
      linkedAccountsUsers: 7,
      loggedInUsers: 6,
      paidUsers: 3,
    });
  });
});
