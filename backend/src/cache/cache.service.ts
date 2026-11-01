import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: RedisClient | null;
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private enabled = false;
  private lastErrorAt = 0;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')?.trim() || this.config.get<string>('REDIS_PRIVATE_URL')?.trim();
    if (!url) {
      this.client = null;
      return;
    }

    this.client = createClient({
      url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 250, 3000),
      },
    });
    this.client.on('ready', () => { this.enabled = true; });
    this.client.on('reconnecting', () => { this.enabled = false; });
    this.client.on('error', (error) => this.logUnavailable(error));
  }

  async onModuleInit() {
    if (!this.client) return;
    try {
      await this.client.connect();
      this.enabled = true;
      this.logger.log('Redis cache connected');
    } catch (error) {
      this.enabled = false;
      this.logUnavailable(error);
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) await this.client.quit();
  }

  status() {
    if (!this.client) return 'disabled';
    return this.enabled && this.client.isReady ? 'ready' : 'unavailable';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;
    try {
      const value = await this.client!.get(key);
      return value === null ? null : JSON.parse(value) as T;
    } catch (error) {
      this.logUnavailable(error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    if (!this.isReady()) return false;
    try {
      await this.client!.setEx(key, Math.max(1, ttlSeconds), JSON.stringify(value));
      return true;
    } catch (error) {
      this.logUnavailable(error);
      return false;
    }
  }

  async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>) {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const pending = (async () => {
      const value = await loader();
      await this.set(key, value, ttlSeconds);
      return value;
    })();
    this.inFlight.set(key, pending);
    try {
      return await pending;
    } finally {
      this.inFlight.delete(key);
    }
  }

  async invalidatePrefix(prefix: string) {
    if (!this.isReady()) return;
    try {
      for await (const key of this.client!.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) {
        await this.client!.del(key);
      }
    } catch (error) {
      this.logUnavailable(error);
    }
  }

  private isReady() {
    return Boolean(this.client && this.enabled && this.client.isReady);
  }

  private logUnavailable(error: unknown) {
    if (Date.now() - this.lastErrorAt < 60_000) return;
    this.lastErrorAt = Date.now();
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis cache unavailable; using database fallback (${message})`);
  }
}
