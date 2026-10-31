import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { GlobalResponseInterceptor } from './common/interceptors/global-response.interceptor';

function getAllowedOrigins(config: ConfigService): string[] {
  const configuredOrigins =
    config.get<string>('CORS_ORIGINS') || config.get<string>('FRONTEND_URL') || 'http://localhost:5173';

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getPositiveLimit(config: ConfigService, key: string, fallback: number): number {
  const value = Number(config.get<string | number>(key, fallback));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = String(config.get<string>('NODE_ENV', 'development')).toLowerCase();
  const allowedOrigins = getAllowedOrigins(config);

  app.set('trust proxy', 1);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: false, limit: '1mb', parameterLimit: 100 });
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: getPositiveLimit(config, 'RATE_LIMIT_PER_MINUTE', 240),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again shortly.' },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: getPositiveLimit(config, 'AUTH_RATE_LIMIT', 30),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  });
  app.use(generalLimiter);
  app.use(
    [
      '/auth/login',
      '/auth/register',
      '/auth/google',
      '/auth/refresh',
      '/auth/admin/forgot-password',
      '/auth/admin/reset-password',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
    ],
    authLimiter,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'deny',
  });

  const enableSwagger =
    String(config.get<string>('ENABLE_SWAGGER', nodeEnv !== 'production' ? 'true' : 'false')).toLowerCase() === 'true';
  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Student Management System API')
      .setDescription('REST API for the student and learning management system')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  app.enableShutdownHooks();
  await app.listen(config.get<number>('PORT', 3001), '0.0.0.0');
}

void bootstrap();
