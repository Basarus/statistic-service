import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { StatsReportController } from '../src/modules/stats-report/stats-report.controller';
import { StatsReportService } from '../src/modules/stats-report/stats-report.service';

describe('Stats report (e2e)', () => {
  let app: INestApplication;

  const serviceMock = {
    getMetrics: jest.fn().mockResolvedValue([
      {
        period: '2026-03-01',
        valueTotal: 120,
        valueUniqueUsers: 98,
        valueUniqueAccounts: 91,
      },
    ]),
    getCurrentMonthWidget: jest.fn().mockResolvedValue({
      webLogins: 20,
      mobileLogins: 40,
      uniqueUsers: 50,
      successfulPayments: 10,
      meterReadingsSent: 11,
      receiptsDownloaded: 9,
      requestsSent: 14,
    }),
    getAuthMethods: jest.fn().mockResolvedValue({
      email: 11,
      phone: 7,
      vk: 3,
      other: 2,
    }),
    getRequestTypes: jest.fn().mockResolvedValue([
      { requestType: 'verification', valueTotal: 19 },
      { requestType: 'connection', valueTotal: 8 },
    ]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatsReportController],
      providers: [
        {
          provide: StatsReportService,
          useValue: serviceMock,
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

  it('GET /reports/metrics returns metrics points', () => {
    return request(app.getHttpServer())
      .get('/reports/metrics')
      .query({
        metricCode: 'login_success',
        organizationId: 10,
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
        groupBy: 'day',
      })
      .expect(200)
      .expect([
        {
          period: '2026-03-01',
          valueTotal: 120,
          valueUniqueUsers: 98,
          valueUniqueAccounts: 91,
        },
      ]);
  });

  it('GET /widgets/current-month returns summary', () => {
    return request(app.getHttpServer())
      .get('/widgets/current-month')
      .query({ organizationId: 10 })
      .expect(200)
      .expect({
        webLogins: 20,
        mobileLogins: 40,
        uniqueUsers: 50,
        successfulPayments: 10,
        meterReadingsSent: 11,
        receiptsDownloaded: 9,
        requestsSent: 14,
      });
  });

  it('GET /reports/auth-methods returns split', () => {
    return request(app.getHttpServer())
      .get('/reports/auth-methods')
      .query({
        organizationId: 10,
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      })
      .expect(200)
      .expect({
        email: 11,
        phone: 7,
        vk: 3,
        other: 2,
      });
  });

  it('GET /reports/request-types returns split', () => {
    return request(app.getHttpServer())
      .get('/reports/request-types')
      .query({
        organizationId: 10,
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
      })
      .expect(200)
      .expect([
        { requestType: 'verification', valueTotal: 19 },
        { requestType: 'connection', valueTotal: 8 },
      ]);
  });


  it('GET /widgets/current-month returns 400 for invalid organizationId', () => {
    return request(app.getHttpServer()).get('/widgets/current-month').query({ organizationId: 'nan' }).expect(400);
  });

  it('GET /reports/metrics returns 400 for invalid query', () => {
    return request(app.getHttpServer())
      .get('/reports/metrics')
      .query({
        metricCode: 'login_success',
        organizationId: 'nan',
        dateFrom: 'bad',
        dateTo: '2026-03-31',
        groupBy: 'week',
      })
      .expect(400);
  });
});
