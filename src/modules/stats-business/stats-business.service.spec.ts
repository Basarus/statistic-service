import { Test, TestingModule } from '@nestjs/testing';

import { StatsBusinessRepository } from './repositories/stats-business.repository';
import { StatsBusinessService } from './stats-business.service';

describe('StatsBusinessService', () => {
  let service: StatsBusinessService;
  const repositoryMock = {
    upsertSnapshot: jest.fn(),
    findSnapshots: jest.fn(),
    getConversionRows: jest.fn(),
    getLatestInactiveUsers: jest.fn(),
    buildInactiveUsersSnapshot: jest.fn(),
    buildPaymentTypeSnapshot: jest.fn(),
    buildAuthMethodSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(repositoryMock).forEach((fn) => fn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsBusinessService,
        {
          provide: StatsBusinessRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<StatsBusinessService>(StatsBusinessService);
  });

  it('builds inactive users snapshot via repository projection', async () => {
    repositoryMock.buildInactiveUsersSnapshot.mockResolvedValue(undefined);
    await service.buildInactiveUsersSnapshot();
    expect(repositoryMock.buildInactiveUsersSnapshot).toHaveBeenCalled();
  });

  it('builds payment type snapshot via repository projection', async () => {
    repositoryMock.buildPaymentTypeSnapshot.mockResolvedValue(undefined);
    await service.buildPaymentTypeSnapshot();
    expect(repositoryMock.buildPaymentTypeSnapshot).toHaveBeenCalled();
  });

  it('returns conversion response', async () => {
    repositoryMock.getConversionRows.mockResolvedValue([
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

  it('returns zero conversion values when no data exists', async () => {
    repositoryMock.getConversionRows.mockResolvedValue([]);
    await expect(
      service.getConversion({ organizationId: 10, dateFrom: '2026-03-01', dateTo: '2026-03-31' }),
    ).resolves.toEqual({
      registeredUsers: 0,
      linkedAccountsUsers: 0,
      loggedInUsers: 0,
      paidUsers: 0,
    });
  });
});
