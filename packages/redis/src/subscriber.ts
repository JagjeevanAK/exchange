import Redis from 'ioredis';
import { redisConfig } from '@exchange/config';

// Store callbacks for each symbol
const priceCallbacks: Map<string, Set<(price: number, symbol: string) => void>> = new Map();

// Track subscribed symbols to avoid duplicate subscriptions
const subscribedSymbols: Set<string> = new Set();

// Latest prices cache
const latestPrices: Map<string, number> = new Map();

// Subscriber instance
let subscriber: Redis | null = null;

export interface TickerData {
  E: string; // Event time
  T: string; // Trade time
  s: string; // Symbol
  t: string; // Trade ID
  p: string; // Price
  q: string; // Quantity
}

/**
 * Initialize the Redis subscriber connection
 */
export async function initSubscriber(): Promise<void> {
  if (subscriber) {
    console.log('Redis subscriber already initialized');
    return;
  }

  subscriber = new Redis(redisConfig.url, {
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
  });

  subscriber.on('connect', () => {
    console.log('Redis subscriber connected');
  });

  subscriber.on('error', (err) => {
    console.error('Redis subscriber error:', err);
  });

  subscriber.on('message', (channel: string, message: string) => {
    try {
      const data: TickerData = JSON.parse(message);
      const price = parseFloat(data.p);
      const symbol = data.s;

      // Update latest price cache
      latestPrices.set(symbol, price);

      // Call all registered callbacks for this symbol
      const callbacks = priceCallbacks.get(symbol);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(price, symbol);
          } catch (err) {
            console.error(`Error in price callback for ${symbol}:`, err);
          }
        });
      }
    } catch (err) {
      console.error(`Error parsing message from ${channel}:`, err);
    }
  });
}

/**
 * Get the subscriber instance (initializes if needed)
 */
export function getSubscriber(): Redis | null {
  return subscriber;
}

/**
 * Subscribe to price updates for a specific symbol
 */
export async function subscribeToPrice(
  symbol: string,
  callback: (price: number, symbol: string) => void
): Promise<void> {
  if (!subscriber) {
    await initSubscriber();
  }

  // Add callback to the set
  if (!priceCallbacks.has(symbol)) {
    priceCallbacks.set(symbol, new Set());
  }
  priceCallbacks.get(symbol)!.add(callback);

  // Subscribe to the channel if not already subscribed
  if (!subscribedSymbols.has(symbol)) {
    await subscriber!.subscribe(symbol);
    subscribedSymbols.add(symbol);
    console.log(`Subscribed to price updates for ${symbol}`);
  }
}

/**
 * Subscribe to price updates for multiple symbols
 */
export async function subscribeToMultiplePrices(
  symbols: string[],
  callback: (price: number, symbol: string) => void
): Promise<void> {
  for (const symbol of symbols) {
    await subscribeToPrice(symbol, callback);
  }
}

/**
 * Unsubscribe a callback from a symbol
 */
export async function unsubscribeFromPrice(
  symbol: string,
  callback: (price: number, symbol: string) => void
): Promise<void> {
  const callbacks = priceCallbacks.get(symbol);
  if (callbacks) {
    callbacks.delete(callback);

    // If no more callbacks for this symbol, unsubscribe from Redis
    if (callbacks.size === 0) {
      priceCallbacks.delete(symbol);
      subscribedSymbols.delete(symbol);
      if (subscriber) {
        await subscriber.unsubscribe(symbol);
        console.log(`Unsubscribed from price updates for ${symbol}`);
      }
    }
  }
}

/**
 * Get the latest cached price for a symbol
 */
export function getLatestPrice(symbol: string): number | undefined {
  return latestPrices.get(symbol);
}

/**
 * Get all symbols currently being tracked
 */
export function getSubscribedSymbols(): Set<string> {
  return new Set(subscribedSymbols);
}

/**
 * Cleanup and close the Redis connection
 */
export async function closeSubscriber(): Promise<void> {
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
    subscribedSymbols.clear();
    priceCallbacks.clear();
    latestPrices.clear();
    console.log('Redis subscriber closed');
  }
}
