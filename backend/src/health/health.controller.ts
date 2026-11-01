import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly cache: CacheService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'campusflow-api',
        revision: process.env.RAILWAY_GIT_COMMIT_SHA || null,
        cache: this.cache.status(),
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('Service unavailable');
    }
  }
}
