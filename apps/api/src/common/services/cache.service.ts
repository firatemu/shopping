import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Cache Service — cache-aside pattern.
 *
 * Usage:
 *  await cacheService.set('products:list:tenant1', data, 300);  // 5 min TTL
 *  const data = await cacheService.get('products:list:tenant1');
 *  await cacheService.delete('products:list:tenant1');
 *  await cacheService.deleteByPrefix('products:list:');
 *
 * All keys are prefixed with a configurable KEY_PREFIX (default: 'textilepos:').
 * Cache invalidation should be called on mutations (create/update/delete).
 */

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly keyPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix = this.configService.get<string>('CACHE_KEY_PREFIX', 'textilepos');

    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', '') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => this.logger.error('Redis cache error:', err));
    this.client.on('connect', () => this.logger.log('Cache Redis connected'));

    this.client.connect().catch((err) => {
      this.logger.warn('Cache Redis connection failed — caching disabled:', err.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  private key(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  /**
   * Get a cached value. Returns null if not found or on error.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(this.key(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache get error for key ${key}:`, err);
      return null;
    }
  }

  /**
   * Set a cached value with TTL (seconds).
   */
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.setex(this.key(key), ttlSeconds, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(`Cache set error for key ${key}:`, err);
    }
  }

  /**
   * Delete a specific cache key.
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.key(key));
    } catch (err) {
      this.logger.warn(`Cache delete error for key ${key}:`, err);
    }
  }

  /**
   * Delete all keys matching a prefix pattern.
   * Uses SCAN (not KEYS) for production safety.
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const fullPrefix = this.key(prefix);
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${fullPrefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache deleteByPrefix error for prefix ${prefix}:`, err);
    }
  }

  /**
   * Get or set pattern — cache-aside one-liner.
   * Returns cached value if present, otherwise calls fetcher, caches, and returns.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
