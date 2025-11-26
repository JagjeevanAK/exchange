import { WebSocket } from "ws";
import type { stream, Ticker } from "./types";
import { enqueue, consume } from "./lib/dbQueue";
import { pub } from "./lib/publisher";

const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcfdusd@trade/ethusdt@trade/usdcusdt@trade/solusdt@trade/btcusdt@trade/ethfdusd@trade/ethusdc@trade/xrpusdc@trade/solfdusd@trade/solusdc@trade');

// Start the database consumer
consume('db').catch(console.error);

ws.on("open", () => {
    console.log("Connected to server");
    
    ws.on("message", async (event) => {
        const data = JSON.parse(event.toString()) as stream;
    
        const dbData: Ticker = {
            E: new Date(data.data.E),
            T: new Date(data.data.T),
            s: data.data.s,
            t: data.data.t,
            p: data.data.p,
            q: data.data.q
        }
    
        console.log(dbData);
        await pub(dbData.s, JSON.stringify(dbData));
        await enqueue('db', JSON.stringify(dbData));
    });
});

ws.on('close',()=>{
    console.log("Ws Server closed Gracefully");
});
