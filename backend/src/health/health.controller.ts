import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { MediaStorageService } from '../media/media-storage.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly media: MediaStorageService,
  ) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'campusflow-api',
        revision: process.env.RAILWAY_GIT_COMMIT_SHA || null,
        cache: this.cache.status(),
        media: this.media.configuration(),
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('Service unavailable');
    }
  }
}
