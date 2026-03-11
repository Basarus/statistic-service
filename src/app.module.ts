import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { appConfig } from './config/app.config';
import { validateEnvironment } from './config/env.validation';
import { DictionaryModule } from './modules/dictionary/dictionary.module';
import { HealthModule } from './modules/health/health.module';
import { StatsAggregateModule } from './modules/stats-aggregate/stats-aggregate.module';
import { StatsIngestModule } from './modules/stats-ingest/stats-ingest.module';
import { StatsReportModule } from './modules/stats-report/stats-report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),
    HealthModule,
    DictionaryModule,
    StatsIngestModule,
    StatsAggregateModule,
    StatsReportModule,
  ],
})
export class AppModule {}
