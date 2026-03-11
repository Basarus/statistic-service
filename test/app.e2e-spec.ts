import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';

import { StatEventEntity } from '../src/database/entities/stat-event.entity';
import { StatsIngestAuthGuard } from '../src/modules/stats-ingest/stats-ingest.auth.guard';
import { StatsIngestController } from '../src/modules/stats-ingest/stats-ingest.controller';
import { StatsIngestService } from '../src/modules/stats-ingest/stats-ingest.service';

describe('Stats ingest (e2e)', () => {
  let app: INestApplication;
  const storedEvents = new Map<string, Record<string, unknown>>();

  const repositoryMock = {
    createQueryBuilder: () => {
      const state: { values?: Record<string, unknown> } = {};

      return {
        insert() {
          return this;
        },
        into() {
          return this;
        },
        values(values: Record<string, unknown>) {
          state.values = values;
          return this;
        },
        orIgnore() {
          return this;
        },
        async execute() {
          const eventUuid = String(state.values?.eventUuid);

          if (storedEvents.has(eventUuid)) {
            return { identifiers: [] };
          }

          storedEvents.set(eventUuid, state.values ?? {});
          return { identifiers: [{ id: '1' }] };
        },
      };
    },
  };

  beforeEach(async () => {
    storedEvents.clear();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatsIngestController],
      providers: [
        StatsIngestService,
        StatsIngestAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'internalApiKey') {
                return 'test-internal-key';
              }
              throw new Error(`Unexpected config key: ${key}`);
            },
          },
        },
        {
          provide: getRepositoryToken(StatEventEntity),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
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
      .expect({
        accepted: true,
        duplicate: false,
        eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda',
      });
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

    await request(app.getHttpServer())
      .post('/internal/events')
      .set('x-api-key', 'test-internal-key')
      .send(payload)
      .expect(201)
      .expect({ accepted: true, duplicate: false, eventUuid: payload.eventUuid });

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

  it('POST /internal/events returns 400 for invalid payload', () => {
    return request(app.getHttpServer())
      .post('/internal/events')
      .set('x-api-key', 'test-internal-key')
      .send({
        eventName: 'auth.login.success',
        occurredAt: 'invalid-date',
        organizationId: 'abc',
      })
      .expect(400);
  });
});
