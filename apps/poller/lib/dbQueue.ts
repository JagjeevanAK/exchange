import { Redis } from "ioredis";
import { insertTrade } from "../db/insertData";

// Use Redis URL from environment variable, fallback to default for local development
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

console.log(`DB Queue connecting to Redis at: ${redisUrl}`);

export async function enqueue(chan: string, data: string){
    await redis.lpush(chan, data);
}

export async function consume(chan:string){
    console.log(`Starting database consumer for channel: ${chan}`);
    while (true) {
        try {
            const result = await redis.brpop(chan, 0);
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