import Redis from "ioredis";

const sub = new Redis();

export default async function pollerSubscriber(ticker: string){
    await sub.connect();

    sub.on('connection',(channel, msg)=>{
        const payload = JSON.parse(msg);

        
    });
}