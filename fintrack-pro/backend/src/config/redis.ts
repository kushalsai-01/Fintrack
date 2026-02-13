import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

const redis = new (Redis as any)(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export { redis };

export function getRedis(): any {
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache:', error);
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.warn('Error closing Redis connection:', error);
  }
}

// Cache helper functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis cache get error:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  try {
    const client = getRedis();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis cache set error:', error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
  } catch (error) {
    logger.error('Redis cache delete error:', error);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const client = getRedis();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    logger.error('Redis cache delete pattern error:', error);
  }
}
