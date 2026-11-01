import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function databaseUrlWithPoolConfig() {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) return databaseUrl;

  const connectionLimit = Number(process.env.DATABASE_POOL_SIZE || (process.env.NODE_ENV === 'production' ? 100 : 5));
  const poolTimeout = Number(process.env.DATABASE_POOL_TIMEOUT || 20);

  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', String(connectionLimit));
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', String(poolTimeout));
    return url.toString();
  } catch {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    const params = [
      !databaseUrl.includes('connection_limit=') ? `connection_limit=${connectionLimit}` : '',
      !databaseUrl.includes('pool_timeout=') ? `pool_timeout=${poolTimeout}` : '',
    ].filter(Boolean);
    return params.length ? `${databaseUrl}${separator}${params.join('&')}` : databaseUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasources: { db: { url: databaseUrlWithPoolConfig() } } });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
