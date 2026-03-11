import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { StatEventWriteRepository } from '../src/modules/stats-ingest/repositories/stat-event-write.repository';
import { StatsIngestAuthGuard } from '../src/modules/stats-ingest/stats-ingest.auth.guard';
import { StatsIngestController } from '../src/modules/stats-ingest/stats-ingest.controller';
import { StatsIngestService } from '../src/modules/stats-ingest/stats-ingest.service';

describe('Stats ingest (e2e)', () => {
  let app: INestApplication;
  const seenEvents = new Set<string>();

  beforeEach(async () => {
    seenEvents.clear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatsIngestController],
      providers: [
        StatsIngestService,
        StatsIngestAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'internalApiKey') return 'test-internal-key';
              throw new Error(`Unexpected config key: ${key}`);
            },
          },
        },
        {
          provide: StatEventWriteRepository,
          useValue: {
            insertIgnore: async (values: { eventUuid?: string }) => {
              const eventUuid = String(values.eventUuid);
              if (seenEvents.has(eventUuid)) return true;
              seenEvents.add(eventUuid);
              return false;
            },
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
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  it('POST /internal/events returns 201 for valid event', () => {
    return request(app.getHttpServer())
      .post('/internal/events')
      .set('x-api-key', 'test-internal-key')
      .send({
        eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda',
        eventName: 'auth.login.success',
        eventCategory: 'auth',
        occurredAt: '2026-03-11T10:00:00.000Z',
        organizationId: 123,
        isSuccess: true,
        sourceSystem: 'lka-monolith',
      })
      .expect(201)
      .expect({ accepted: true, duplicate: false, eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda' });
  });

  it('POST /internal/events returns 201 and duplicate=true for repeated event', async () => {
    const payload = {
      eventUuid: 'd9ed2adf-2745-45e0-ab2b-ae71661dd4cf',
      eventName: 'auth.login.success',
      eventCategory: 'auth',
      occurredAt: '2026-03-11T10:00:00.000Z',
      organizationId: 123,
      isSuccess: true,
      sourceSystem: 'lka-monolith',
    };

    await request(app.getHttpServer()).post('/internal/events').set('x-api-key', 'test-internal-key').send(payload).expect(201);
    await request(app.getHttpServer())
      .post('/internal/events')
      .set('x-api-key', 'test-internal-key')
      .send(payload)
      .expect(201)
      .expect({ accepted: true, duplicate: true, eventUuid: payload.eventUuid });
  });

  it('POST /internal/events returns 401 for missing api key', () => {
    return request(app.getHttpServer())
      .post('/internal/events')
      .send({
        eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda',
        eventName: 'auth.login.success',
        eventCategory: 'auth',
        occurredAt: '2026-03-11T10:00:00.000Z',
        organizationId: 123,
        isSuccess: true,
        sourceSystem: 'lka-monolith',
      })
      .expect(401);
  });

  it('POST /internal/events returns 400 for forbidden payload keys', () => {
    return request(app.getHttpServer())
      .post('/internal/events')
      .set('x-api-key', 'test-internal-key')
      .send({
        eventUuid: '0f7f9df2-6e6a-4fbe-bc54-6ce4344f301b',
        eventName: 'payment.success',
        eventCategory: 'payment',
        occurredAt: '2026-03-11T10:00:00.000Z',
        organizationId: 123,
        isSuccess: true,
        sourceSystem: 'lka-monolith',
        payload: { paymentToken: 'secret' },
      })
      .expect(400);
  });

  it('POST /internal/events returns 400 for invalid payload', () => {
    return request(app.getHttpServer())
      .post('/internal/events')
      .set('x-api-key', 'test-internal-key')
      .send({ eventName: 'auth.login.success', occurredAt: 'invalid-date', organizationId: 'abc' })
      .expect(400);
  });
});
