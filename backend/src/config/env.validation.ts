export function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => typeof config[key] !== 'string' || String(config[key]).trim().length === 0);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  const nodeEnv = String(config.NODE_ENV ?? 'development').toLowerCase();

  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  // Keep the default conservative for a single hosted API process. A pool of
  // 100 connections can exhaust small managed Postgres plans before the app
  // itself becomes CPU-bound. Scale this explicitly when the database plan
  // and number of API replicas justify it.
  const databasePoolSize = Number(config.DATABASE_POOL_SIZE ?? (nodeEnv === 'production' ? 10 : 5));
  if (!Number.isInteger(databasePoolSize) || databasePoolSize < 1 || databasePoolSize > 100) {
    throw new Error('DATABASE_POOL_SIZE must be an integer between 1 and 100');
  }

  const databasePoolTimeout = Number(config.DATABASE_POOL_TIMEOUT ?? 20);
  if (!Number.isInteger(databasePoolTimeout) || databasePoolTimeout < 1 || databasePoolTimeout > 300) {
    throw new Error('DATABASE_POOL_TIMEOUT must be an integer between 1 and 300 seconds');
  }

  const rateLimitPerMinute = Number(config.RATE_LIMIT_PER_MINUTE ?? 240);
  if (!Number.isInteger(rateLimitPerMinute) || rateLimitPerMinute < 10) {
    throw new Error('RATE_LIMIT_PER_MINUTE must be an integer of at least 10');
  }

  const authRateLimit = Number(config.AUTH_RATE_LIMIT ?? 30);
  if (!Number.isInteger(authRateLimit) || authRateLimit < 5) {
    throw new Error('AUTH_RATE_LIMIT must be an integer of at least 5');
  }

  const contactRateLimit = Number(config.CONTACT_RATE_LIMIT ?? 12);
  if (!Number.isInteger(contactRateLimit) || contactRateLimit < 1) {
    throw new Error('CONTACT_RATE_LIMIT must be a positive integer');
  }

  const bcryptSaltRounds = Number(config.BCRYPT_SALT_ROUNDS ?? 12);
  if (!Number.isInteger(bcryptSaltRounds) || bcryptSaltRounds < 10 || bcryptSaltRounds > 15) {
    throw new Error('BCRYPT_SALT_ROUNDS must be an integer between 10 and 15');
  }

  if (nodeEnv === 'production') {
    const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
    const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
    const otpSecret = String(config.PASSWORD_RESET_OTP_SECRET ?? '');
    for (const [key, secret] of [['JWT_ACCESS_SECRET', accessSecret], ['JWT_REFRESH_SECRET', refreshSecret]] as const) {
      if (secret.length < 32 || secret.toLowerCase().includes('student_management')) {
        throw new Error(`${key} must be a strong random secret of at least 32 characters in production`);
      }
    }

    if (accessSecret === refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production');
    }

    if (otpSecret.length < 32 || otpSecret === accessSecret || otpSecret === refreshSecret) {
      throw new Error('PASSWORD_RESET_OTP_SECRET must be a separate strong random secret of at least 32 characters in production');
    }

    const origins = String(config.CORS_ORIGINS || config.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (!origins.length) {
      throw new Error('FRONTEND_URL or CORS_ORIGINS is required in production');
    }

    for (const origin of origins) {
      if (origin === '*' || !/^https:\/\/[^/]+$/i.test(origin)) {
        throw new Error('Production CORS origins must be exact HTTPS origins without wildcards or paths');
      }
    }
  }

  return {
    ...config,
    PORT: port,
    DATABASE_POOL_SIZE: databasePoolSize,
    DATABASE_POOL_TIMEOUT: databasePoolTimeout,
    RATE_LIMIT_PER_MINUTE: rateLimitPerMinute,
    AUTH_RATE_LIMIT: authRateLimit,
    CONTACT_RATE_LIMIT: contactRateLimit,
    BCRYPT_SALT_ROUNDS: bcryptSaltRounds,
    JWT_ISSUER: String(config.JWT_ISSUER ?? 'campusflow-api'),
    JWT_AUDIENCE: String(config.JWT_AUDIENCE ?? 'campusflow-web'),
  };
}
