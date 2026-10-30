export function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => typeof config[key] !== 'string' || String(config[key]).trim().length === 0);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  return { ...config, PORT: port };
}
