import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketManager } from '@/lib/websocket-manager';

interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  timestamp?: number;
}

interface UseWebSocketReturn {
  marketData: Map<string, MarketData>;
  isConnected: boolean;
  error: string | null;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
}

export const useWebSocket = (initialSymbols: string[] = []): UseWebSocketReturn => {
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(() => new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialSymbolsRef = useRef(initialSymbols);

  // Use refs to batch updates and prevent infinite loops
  const marketDataRef = useRef<Map<string, MarketData>>(new Map());
  const updateScheduledRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const manager = getWebSocketManager();

    // Connect to WebSocket
    manager.connect();

    // Subscribe to initial symbols
    if (initialSymbolsRef.current.length > 0) {
      manager.subscribe(initialSymbolsRef.current);
    }

    // Batch state updates to prevent excessive re-renders
    const scheduleUpdate = () => {
      if (updateScheduledRef.current) return;
      updateScheduledRef.current = true;

      // Use requestAnimationFrame for smoother updates, with a minimum interval
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        updateScheduledRef.current = false;
        // Create new Map only when actually updating state
        setMarketData(new Map(marketDataRef.current));
      }, 80);
    };

    // Set up handlers
    const unsubMessage = manager.onMessage((data: unknown) => {
      // Handle subscription confirmations
      if (typeof data === 'object' && data !== null) {
        const msg = data as Record<string, unknown>;

        if (msg.op === 'subscribed' || msg.op === 'unsubscribed') {
          console.log(`WebSocket: ${msg.op}:`, msg.symbols);
          return;
        }

        // Handle array response (subscription list from server)
        if (Array.isArray(data)) {
          console.log('WebSocket: Subscription confirmed:', data);
          return;
        }

        // Handle market data
        // Format: { s: "BTCUSDT", p: "43000.50", T: Date, E: Date, t: "123", q: "0.001" }
        if (msg.s && msg.p) {
          const symbol = msg.s as string;
          const price = parseFloat(msg.p as string);
          const timestamp = msg.T ? new Date(msg.T as string).getTime() : Date.now();

          if (symbol && price > 0) {
            const spread = price * 0.0001;

            // Update the ref immediately (no re-render)
            marketDataRef.current.set(symbol, {
              symbol,
              bid: price - spread,
              ask: price + spread,
              timestamp,
            });

            // Schedule a batched state update
            scheduleUpdate();
          }
        }
      }
    });

    const unsubConnect = manager.onConnect(() => {
      console.log('WebSocket: Connected');
      setIsConnected(true);
      setError(null);
    });

    const unsubDisconnect = manager.onDisconnect(() => {
      console.log('WebSocket: Disconnected');
      setIsConnected(false);
    });

    const unsubError = manager.onError((err) => {
      console.error('WebSocket: Error', err);
      setError(err);
    });

    // Check initial connection state
    setIsConnected(manager.isConnected());

    return () => {
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      unsubError();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Don't disconnect on unmount - let the singleton manage the connection
    };
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    const manager = getWebSocketManager();
    manager.subscribe(symbols);
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    const manager = getWebSocketManager();
    manager.unsubscribe(symbols);
  }, []);

  return {
    marketData,
    isConnected,
    error,
    subscribe,
    unsubscribe,
  };
};
