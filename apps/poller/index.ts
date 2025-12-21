import { WebSocket } from 'ws';
import type { stream, Ticker } from './types';
import { enqueue, consume } from './lib/dbQueue';
import { pub } from './lib/publisher';

const BINANCE_WS_URL ='wss://stream.binance.com:9443/stream?streams=btcfdusd@trade/ethusdt@trade/usdcusdt@trade/solusdt@trade/btcusdt@trade/ethfdusd@trade/ethusdc@trade/xrpusdc@trade/solfdusd@trade/solusdc@trade';

const RECONNECT_DELAY_MS = 1000; 
const PING_INTERVAL_MS = 3000;

let ws: WebSocket | null = null;
let pingInterval: Timer | null = null;
let isConnecting = false;

function connect() {
  if (isConnecting) {
    console.log('Connection attempt already in progress, skipping...');
    return;
  }

  isConnecting = true;
  console.log('Connecting to Binance WebSocket...');

  ws = new WebSocket(BINANCE_WS_URL);

  ws.on('open', () => {
    isConnecting = false;
    console.log('Connected to Binance WebSocket');

    if (pingInterval) {
      clearInterval(pingInterval);
    }
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, PING_INTERVAL_MS);
  });

  ws.on('message', async (event) => {
    try {
      const data = JSON.parse(event.toString()) as stream;

      const dbData: Ticker = {
        E: new Date(data.data.E),
        T: new Date(data.data.T),
        s: data.data.s,
        t: data.data.t,
        p: data.data.p,
        q: data.data.q,
      };

      console.log(dbData);
      await pub(dbData.s, JSON.stringify(dbData));
      await enqueue('db', JSON.stringify(dbData));
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', (code, reason) => {
    isConnecting = false;
    console.log(
      `WebSocket closed. Code: ${code}, Reason: ${reason.toString() || 'No reason provided'}`
    );

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    console.log(`Reconnecting in ${RECONNECT_DELAY_MS}ms...`);
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });

  ws.on('pong', () => {
    console.log('Pong received - connection alive');
  });
}

consume('db').catch(console.error);

connect();

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  if (ws) {
    ws.close(1000, 'Process terminating');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  if (ws) {
    ws.close(1000, 'Process terminating');
  }
  process.exit(0);
});
