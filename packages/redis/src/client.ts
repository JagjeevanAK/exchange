import Redis from 'ioredis';
import { redisConfig } from '@exchange/config';

// Singleton Redis client for general operations
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig.url, {
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis client closed');
  }
}

// Factory function to create new Redis instances
export function createRedisClient(): Redis {
  return new Redis(redisConfig.url, {
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
  });
}

// Export Redis type for external use
export { Redis };
