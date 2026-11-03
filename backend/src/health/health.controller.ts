import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { MediaStorageService } from '../media/media-storage.service';
import { MailService } from '../auth/mail.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly media: MediaStorageService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'campusflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const response = {
        status: 'ok',
        service: 'campusflow-api',
        revision: process.env.RAILWAY_GIT_COMMIT_SHA || null,
        timestamp: new Date().toISOString(),
      };
      const nodeEnv = String(this.config.get('NODE_ENV', 'development')).toLowerCase();
      const includeDetails = String(this.config.get('HEALTH_DETAILS', nodeEnv !== 'production' ? 'true' : 'false')).toLowerCase() === 'true';
      return includeDetails
        ? { ...response, cache: this.cache.status(), media: this.media.configuration(), mail: this.mail.configuration() }
        : response;
    } catch {
      throw new ServiceUnavailableException('Service unavailable');
    }
  }
}
