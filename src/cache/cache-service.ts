import { redisManager } from './redis.js';
import { logger } from '../utils/logger.js';

export class CacheService {
  /**
   * Generates a namespaced cache key.
   * e.g. generateKey('issues', 'owner/repo', 'open') -> 'forgeops:issues:owner/repo:open'
   */
  static generateKey(domain: string, ...parts: string[]): string {
    return ['forgeops', domain, ...parts].join(':');
  }

  /**
   * Retrieves an item from the cache.
   * Returns null on Cache Miss.
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await redisManager.getClient();
      if (!client || !client.isOpen) return null;

      const data = await client.get(key);
      if (data) {
        logger.debug({ context: 'CacheService', event: 'HIT', key }, 'Cache hit');
        return JSON.parse(data) as T;
      }

      logger.debug({ context: 'CacheService', event: 'MISS', key }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ context: 'CacheService', key, error }, 'Error reading from cache');
      return null; // Gracefully degrade on cache failure
    }
  }

  /**
   * Stores an item in the cache with a Time-To-Live (TTL) in seconds.
   */
  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const client = await redisManager.getClient();
      if (!client || !client.isOpen) return;

      const serialized = JSON.stringify(value);
      await client.setEx(key, ttlSeconds, serialized);
      logger.debug(
        { context: 'CacheService', event: 'SET', key, ttl: ttlSeconds },
        'Cache updated',
      );
    } catch (error) {
      logger.error({ context: 'CacheService', key, error }, 'Error writing to cache');
    }
  }

  /**
   * Invalidates (deletes) a specific cache key.
   */
  static async invalidate(key: string): Promise<void> {
    try {
      const client = await redisManager.getClient();
      if (!client || !client.isOpen) return;

      await client.del(key);
      logger.info({ context: 'CacheService', event: 'INVALIDATE', key }, 'Cache invalidated');
    } catch (error) {
      logger.error({ context: 'CacheService', key, error }, 'Error invalidating cache');
    }
  }
}
