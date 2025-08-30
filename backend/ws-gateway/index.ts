import { Redis } from 'ioredis';
import { WebSocketServer, WebSocket } from 'ws';

const sub = new Redis;
const PORT = process.env.PORT || '8080';

// Keeps track of all clients per symbol (on this WS node)
const symbolClient = new Map<string, Set<WebSocket>>();

// Keeps track of symbols per client
const clientSymbol = new Map<WebSocket, Set<string>>();

const symbolRefCount = new Map<string, number>();

const subSymbol = (symbol: string)=>{
    const ref = (symbolRefCount.get(symbol) || 0) + 1;
    symbolRefCount.set(symbol, ref);

    if(ref === 1){
        sub.subscribe(symbol).catch(console.error);
    }
}

const unsubSymbol = (symbol: string) =>{
    const ref = (symbolRefCount.get(symbol) || 0) - 1;

    if(ref <= 0 ){
        symbolRefCount.delete(symbol);
        sub.unsubscribe(symbol);
        symbolClient.delete(symbol);
    } else {
        symbolRefCount.set(symbol, ref);
    }
}

const addClientToSymbol = (ws: WebSocket, symbols: string[]) => {
    let set = clientSymbol.get(ws);
    if(!set){
        set = new Set();
        clientSymbol.set(ws, set);
    }
    for (const s of symbols){
        if(set.has(s)) continue;

        set.add(s);

        let client = symbolClient.get(s);

        if(!client){
            client = new Set();
            symbolClient.set(s, client);
        }
        client.add(ws);
        subSymbol(s);
    }
    ws.send(JSON.stringify([...symbols]));
}

const detachClient = (ws: WebSocket, symbols?: string[]) =>{
    const set = clientSymbol.get(ws);

    if(!set || set.size == 0) return;

    const toRemove = symbols ? symbols : [...set];
    const actuallyRemoved: string[] = [];

    for (const s of toRemove) {
        if (!set.has(s)) continue;
        set.delete(s);
        const clients = symbolClient.get(s);
        if (clients) {
            clients.delete(ws);
            if (clients.size === 0) {
                unsubSymbol(s);
            }
        }
        actuallyRemoved.push(s);
    }

    if (actuallyRemoved.length) {
        ws.send(JSON.stringify(actuallyRemoved));
    }
}

async function start() {
    await sub.connect().catch(console.error);
    
    sub.on('message',(channel, msg)=>{

    })

    sub.on('error',(e)=> console.error(e));

    sub.on('disconnect',()=> console.log("Poller Subscriber is okay"));

    const ws = new WebSocketServer({port : parseInt(PORT, 10)});



}

start();