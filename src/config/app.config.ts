export const appConfig = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  internalApiKey: process.env.INTERNAL_API_KEY ?? '',
  aggregation: {
    rawToDailyBatchSize: Number(process.env.AGGREGATION_RAW_TO_DAILY_BATCH_SIZE ?? 5000),
    dailyToMonthlyBatchSize: Number(process.env.AGGREGATION_DAILY_TO_MONTHLY_BATCH_SIZE ?? 1000),
    rawEventsTtlDays: Number(process.env.RAW_EVENTS_TTL_DAYS ?? 90),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'statistic_service',
  },
});
