import Redis from "ioredis";

const publisher = new Redis();


export async function pub(chan: string, data: string){
    publisher.publish(chan, data);
}

