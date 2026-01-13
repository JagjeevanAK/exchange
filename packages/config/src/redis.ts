import './env';

export interface RedisConfig {
  url: string;
  maxRetriesPerRequest: number | null;
}

export const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};
