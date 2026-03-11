import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { StatsBusinessController } from '../src/modules/stats-business/stats-business.controller';
import { StatsBusinessService } from '../src/modules/stats-business/stats-business.service';
import { StatsIngestAuthGuard } from '../src/modules/stats-ingest/stats-ingest.auth.guard';

describe('Stats business (e2e)', () => {
  let app: INestApplication;

  const serviceMock = {
    upsertSnapshot: jest.fn().mockResolvedValue({ accepted: true }),
    getSnapshots: jest.fn().mockResolvedValue([{ snapshotDate: '2026-03-11', valueTotal: 10 }]),
    getConversion: jest.fn().mockResolvedValue({
      registeredUsers: 100,
      linkedAccountsUsers: 80,
      loggedInUsers: 70,
      paidUsers: 30,
    }),
    getLatestInactiveUsers: jest.fn().mockResolvedValue({ snapshotDate: '2026-03-11', inactiveUsers: 12 }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatsBusinessController],
      providers: [
        {
          provide: StatsBusinessService,
          useValue: serviceMock,
        },
        StatsIngestAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => 'test-internal-key',
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('POST /internal/business-snapshots accepts valid payload', () => {
    return request(app.getHttpServer())
      .post('/internal/business-snapshots')
      .set('x-api-key', 'test-internal-key')
      .send({
        snapshotDate: '2026-03-11',
        organizationId: 10,
        metricCode: 'users_without_personal_account',
        valueTotal: 5,
      })
      .expect(201)
      .expect({ accepted: true });
  });

  it('GET /reports/business-snapshots returns list', () => {
    return request(app.getHttpServer())
      .get('/reports/business-snapshots')
      .query({
        organizationId: 10,
        metricCode: 'users_without_personal_account',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      })
      .expect(200)
      .expect([{ snapshotDate: '2026-03-11', valueTotal: 10 }]);
  });

  it('GET /reports/business/conversion returns conversion data', () => {
    return request(app.getHttpServer())
      .get('/reports/business/conversion')
      .query({
        organizationId: 10,
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      })
      .expect(200)
      .expect({
        registeredUsers: 100,
        linkedAccountsUsers: 80,
        loggedInUsers: 70,
        paidUsers: 30,
      });
  });

  it('GET /reports/business/inactive-users returns latest snapshot', () => {
    return request(app.getHttpServer())
      .get('/reports/business/inactive-users')
      .query({ organizationId: 10 })
      .expect(200)
      .expect({ snapshotDate: '2026-03-11', inactiveUsers: 12 });
  });

  it('POST /internal/business-snapshots returns 400 for invalid payload', () => {
    return request(app.getHttpServer())
      .post('/internal/business-snapshots')
      .set('x-api-key', 'test-internal-key')
      .send({
        snapshotDate: 'bad-date',
        organizationId: 'abc',
      })
      .expect(400);
  });
});
