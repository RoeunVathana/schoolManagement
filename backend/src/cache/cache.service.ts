import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;
type LocalCacheEntry = { expiresAt: number; value: unknown };

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: RedisClient | null;
  private readonly inFlight = new Map<string, Promise<unknown>>();
  // Redis is optional in the small production plan. Keep a small local cache
  // so public reads do not hit Postgres on every request while Redis is down.
  // This cache is deliberately bounded and short-lived; Redis remains the
  // shared cache whenever it is available.
  private readonly localCache = new Map<string, LocalCacheEntry>();
  private readonly maxLocalEntries = 256;
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
    this.client.on('ready', () => {
      this.enabled = true;
      this.localCache.clear();
    });
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
    this.localCache.clear();
  }

  status() {
    if (!this.client) return 'disabled';
    return this.enabled && this.client.isReady ? 'ready' : 'unavailable';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) return this.getLocal<T>(key);
    try {
      const value = await this.client!.get(key);
      return value === null ? null : JSON.parse(value) as T;
    } catch (error) {
      this.logUnavailable(error);
      return this.getLocal<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    if (!this.isReady()) {
      this.setLocal(key, value, ttlSeconds);
      return true;
    }
    try {
      await this.client!.setEx(key, Math.max(1, ttlSeconds), JSON.stringify(value));
      return true;
    } catch (error) {
      this.logUnavailable(error);
      this.setLocal(key, value, ttlSeconds);
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
    for (const key of this.localCache.keys()) {
      if (key.startsWith(prefix)) this.localCache.delete(key);
    }
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

  private getLocal<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.localCache.delete(key);
      return null;
    }
    // Refresh insertion order so the least recently used entries are evicted
    // first when the bounded cache reaches its limit.
    this.localCache.delete(key);
    this.localCache.set(key, entry);
    return entry.value as T;
  }

  private setLocal<T>(key: string, value: T, ttlSeconds: number) {
    this.localCache.delete(key);
    this.localCache.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    });
    while (this.localCache.size > this.maxLocalEntries) {
      const oldestKey = this.localCache.keys().next().value;
      if (typeof oldestKey !== 'string') break;
      this.localCache.delete(oldestKey);
    }
  }

  private logUnavailable(error: unknown) {
    if (Date.now() - this.lastErrorAt < 60_000) return;
    this.lastErrorAt = Date.now();
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis cache unavailable; using database fallback (${message})`);
  }
}
