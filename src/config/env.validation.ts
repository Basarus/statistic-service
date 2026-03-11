const numberPattern = /^\d+$/;

export function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'INTERNAL_API_KEY'];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Environment variable ${key} is required`);
    }
  }

  const numericVariables = [
    ['DB_PORT', config.DB_PORT],
    ['AGGREGATION_RAW_TO_DAILY_BATCH_SIZE', config.AGGREGATION_RAW_TO_DAILY_BATCH_SIZE],
    ['AGGREGATION_DAILY_TO_MONTHLY_BATCH_SIZE', config.AGGREGATION_DAILY_TO_MONTHLY_BATCH_SIZE],
    ['RAW_EVENTS_TTL_DAYS', config.RAW_EVENTS_TTL_DAYS],
  ] as const;

  for (const [name, value] of numericVariables) {
    if (value !== undefined && !numberPattern.test(String(value))) {
      throw new Error(`Environment variable ${name} must be numeric`);
    }
  }

  return config;
}
