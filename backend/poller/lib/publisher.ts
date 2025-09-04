import Redis from "ioredis";

// Use Redis URL from environment variable, fallback to default for local development
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const publisher = new Redis(redisUrl);

export async function pub(chan: string, data: string){
    publisher.publish(chan, data);
}

