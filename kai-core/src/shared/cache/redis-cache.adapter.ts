import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { createClient, RedisClientType } from 'redis';
import { CachePort } from './cache.port';

/**
 * Redis Cache Adapter - Infrastructure Layer
 *
 * Implementa CachePort usando Redis como backend de caché.
 * Maneja conexiones, serialización y errores de Redis.
 */
@Injectable()
export class RedisCacheAdapter
  implements CachePort, OnModuleInit, OnModuleDestroy
{
  private client: RedisClientType;
  private isConnected = false;
  private readonly logger = new Logger(RedisCacheAdapter.name);

  constructor(private readonly configService: AppConfigService) {}

  async onModuleInit() {
    if (this.configService.app.features.enableCache) {
      await this.connect();
    }
  }

  async onModuleDestroy() {
    if (this.configService.app.features.enableCache) {
      await this.disconnect();
    }
  }

  private async connect(): Promise<void> {
    const redisConfig = this.configService.redis;

    this.client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: 60000,
        reconnectStrategy: () => false,
      },
      password: redisConfig.password,
      database: redisConfig.db,
    });

    let lastErrorLogAt = 0;
    this.client.on('error', (err) => {
      const now = Date.now();
      if (now - lastErrorLogAt > 60_000) {
        lastErrorLogAt = now;
        this.logger.warn(`Redis connection error: ${err.message}`);
      }
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Disconnected from Redis');
      this.isConnected = false;
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow graceful degradation
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected && this.client) {
      try {
        await this.client.connect();
      } catch (error) {
        this.logger.warn(`Failed to reconnect to Redis: ${error.message}`);
        throw new Error('Redis connection failed');
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      const prefixedKey = `${this.configService.redis.keyPrefix}${key}`;
      const value = await this.client.get(prefixedKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.warn(`Failed to get cache key ${key}: ${error.message}`);
      return null; // Graceful degradation
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.ensureConnected();
      const prefixedKey = `${this.configService.redis.keyPrefix}${key}`;
      const serializedValue = JSON.stringify(value);
      const effectiveTtl = ttl || this.configService.redis.ttl;
      await this.client.setEx(prefixedKey, effectiveTtl, serializedValue);
    } catch (error) {
      this.logger.warn(`Failed to set cache key ${key}: ${error.message}`);
      // Don't throw - allow graceful degradation
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.ensureConnected();
      const prefixedKey = `${this.configService.redis.keyPrefix}${key}`;
      await this.client.del(prefixedKey);
    } catch (error) {
      this.logger.warn(`Failed to delete cache key ${key}: ${error.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.warn(
        `Failed to check existence of cache key ${key}: ${error.message}`,
      );
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      await this.ensureConnected();
      return await this.client.incr(key);
    } catch (error) {
      this.logger.warn(
        `Failed to increment cache key ${key}: ${error.message}`,
      );
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.expire(key, ttl);
    } catch (error) {
      this.logger.warn(
        `Failed to set expiration for cache key ${key}: ${error.message}`,
      );
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      await this.ensureConnected();
      const values = await this.client.mGet(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      this.logger.warn(`Failed to get multiple cache keys: ${error.message}`);
      return new Array(keys.length).fill(null);
    }
  }

  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    try {
      await this.ensureConnected();
      const pipeline = this.client.multi();

      for (const { key, value, ttl } of keyValuePairs) {
        const serializedValue = JSON.stringify(value);
        if (ttl) {
          pipeline.setEx(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Failed to set multiple cache keys: ${error.message}`);
    }
  }

  async mdel(keys: string[]): Promise<void> {
    try {
      await this.ensureConnected();
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to delete multiple cache keys: ${error.message}`,
      );
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      await this.ensureConnected();
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.warn(
        `Failed to get keys with pattern ${pattern}: ${error.message}`,
      );
      return [];
    }
  }

  async flush(): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.flushAll();
    } catch (error) {
      this.logger.warn(`Failed to flush cache: ${error.message}`);
    }
  }
}
