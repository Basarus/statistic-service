import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('/api/v1/events (POST) should return 201 for valid payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/events')
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
      .expect({ accepted: true, eventUuid: 'c2f61d8f-1078-40b6-a2ad-fb5704f82dda' });
  });

  it('/api/v1/events (POST) should return 400 for invalid payload', () => {
    return request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        eventName: 'auth.login.success',
        occurredAt: 'invalid-date',
        organizationId: 'abc',
      })
      .expect(400);
  });
});
