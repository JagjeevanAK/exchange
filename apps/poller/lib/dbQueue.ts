import { Redis } from 'ioredis';
import { insertTrade } from '../db/insertData';

// Use Redis URL from environment variable, fallback to default for local development
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Separate Redis clients for producer and consumer
// brpop blocks the connection, so we need separate connections
const producerRedis = new Redis(redisUrl);
const consumerRedis = new Redis(redisUrl);

console.log(`DB Queue connecting to Redis at: ${redisUrl}`);

export async function enqueue(chan: string, data: string) {
  await producerRedis.lpush(chan, data);
}

export async function consume(chan: string) {
  console.log(`Starting database consumer for channel: ${chan}`);
  while (true) {
    try {
      const result = await consumerRedis.brpop(chan, 0);
      if (result) {
        const [, message] = result; // brpop returns [key, value]
        const job = JSON.parse(message);

        await insertTrade(job);
        console.log(`Inserted trade for ${job.s} at price ${job.p}`);
      }
    } catch (error) {
      console.error('Error processing queue message:', error);
    }
  }
}
