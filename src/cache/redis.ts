import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class RedisManager {
  private client: RedisClientType | null = null;
  private isConnecting: boolean = false;

  /**
   * Returns a connected Redis client singleton.
   * If not connected, it initializes the connection.
   */
  async getClient(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    if (!this.client && !this.isConnecting) {
      this.isConnecting = true;
      try {
        this.client = createClient({
          url: env.REDIS_URL,
        });

        this.client.on('error', (err) =>
          logger.error({ context: 'RedisClient', err }, 'Redis Client Error'),
        );
        this.client.on('connect', () =>
          logger.debug({ context: 'RedisClient' }, 'Redis Client Connected'),
        );
        this.client.on('ready', () =>
          logger.info({ context: 'RedisClient' }, 'Redis Client Ready'),
        );
        this.client.on('end', () =>
          logger.warn({ context: 'RedisClient' }, 'Redis Client Disconnected'),
        );

        await this.client.connect();
      } catch (error) {
        logger.error({ context: 'RedisClient', error }, 'Failed to connect to Redis');
        // Do not crash the app, allow cache misses if Redis is down
      } finally {
        this.isConnecting = false;
      }
    }

    // If we're currently connecting, we just return the pending client
    // (though in a perfect world, we'd wait for connection)
    return this.client as RedisClientType;
  }

  async close() {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
    }
  }
}

export const redisManager = new RedisManager();
