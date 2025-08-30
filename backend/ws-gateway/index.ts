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

const detachClientFromSymbols = (ws: WebSocket, symbols?: string[]) =>{
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
    sub.on('message', (channel, msg) => {
        try {
            const payload = JSON.parse(msg);
            const client = symbolClient.get(channel);

            if (!client || client.size === 0) {
                console.log("No Client is subscribed currently");
                return;
            }

            for (const ws of client) {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify(payload));
                } else {
                    client.delete(ws);
                    detachClientFromSymbols(ws);
                }
            }
        } catch (e) {
            console.error(e);
        }
    });

    sub.on('error', (e) => console.error('Redis error:', e));
    sub.on('end', () => console.log("Redis connection closed"));
    sub.on('reconnecting', () => console.log("Reconnecting to Redis..."));

    const wss = new WebSocketServer({ port: parseInt(PORT, 10) });
    console.log(`WebSocket server running on port ${PORT}`);

    wss.on('connection', (ws) => {
        ws.on('error', (err) => console.error('WebSocket error:', err));

        ws.on('message', (buf) => {
            try {
                const msg = JSON.parse(buf.toString());

                switch (msg.op) {
                    case 'subscribe': {
                        const symbols = Array.isArray(msg.symbols) ? msg.symbols : [];
                        addClientToSymbol(ws, symbols.map((s: string) => s.toUpperCase()));
                        ws.send(JSON.stringify({ op: 'subscribed', symbols }));
                        break;
                    }
                    case 'unsubscribe': {
                        const symbols = Array.isArray(msg.symbols) ? msg.symbols : undefined;
                        detachClientFromSymbols(ws, symbols ? symbols.map((s: string) => s.toUpperCase()) : undefined);
                        ws.send(JSON.stringify({ op: 'unsubscribed', symbols }));
                        break;
                    }
                    default:
                        if (ws.readyState === ws.OPEN) {
                            ws.send(JSON.stringify({ op: 'error', code: 'UNSUPPORTED_OP' }));
                        }
                }

            } catch (error) {
                console.error('Error parsing message:', error);
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ op: 'error', code: 'INVALID_MESSAGE' }));
                }
            }
        });

        ws.on("close", () => detachClientFromSymbols(ws));
    });
}

start().catch((e) => {
    console.error(e);
    process.exit(1);
});