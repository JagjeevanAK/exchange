import Redis from 'ioredis';
import { redisConfig } from '@exchange/config';

// Singleton publisher instance
let publisher: Redis | null = null;

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(redisConfig.url, {
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    });

    publisher.on('connect', () => {
      console.log('Redis publisher connected');
    });

    publisher.on('error', (err) => {
      console.error('Redis publisher error:', err);
    });
  }
  return publisher;
}

export async function publish(channel: string, data: string): Promise<number> {
  const pub = getPublisher();
  return pub.publish(channel, data);
}

export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
    console.log('Redis publisher closed');
  }
}
