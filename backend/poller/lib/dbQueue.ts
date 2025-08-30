import { Redis } from "ioredis";
import { insertTrade } from "../db/insertData";

const redis = new Redis();

export async function enqueue(chan: string, data: string){
    await redis.lpush(chan, data);
}

export async function consume(chan:string){
    while (true) {
        const result = await redis.brpop(chan, 0);
        if (result) {
            const [message] = result;
            const job = JSON.parse(message);

            await insertTrade(job);
        }
    }
}