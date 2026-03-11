const numberPattern = /^\d+$/;

export function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'INTERNAL_API_KEY'];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Environment variable ${key} is required`);
    }
  }

  const dbPort = String(config.DB_PORT);

  if (!numberPattern.test(dbPort)) {
    throw new Error('Environment variable DB_PORT must be numeric');
  }

  return config;
}
