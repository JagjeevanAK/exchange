import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  op: string;
  symbols?: string[];
  [key: string]: unknown;
}

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
  const wsRef = useRef<WebSocket | null>(null);
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const subscribedSymbols = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      console.log('Attempting to connect to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Resubscribe to previous symbols
        if (subscribedSymbols.current.size > 0) {
          const message: WebSocketMessage = {
            op: 'subscribe',
            symbols: Array.from(subscribedSymbols.current)
          };
          wsRef.current?.send(JSON.stringify(message));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.op === 'subscribed' || data.op === 'unsubscribed') {
            console.log(`WebSocket ${data.op}:`, data.symbols);
            return;
          }

          // Handle market data updates - this could be from Binance trade data
          // Format from backend: { s: "BTCUSDT", p: "43000.50", T: Date, E: Date, t: "123", q: "0.001" }
          if (data.s && data.p) {
            const symbol = data.s;
            const price = parseFloat(data.p);
            const timestamp = data.T ? new Date(data.T).getTime() : Date.now();
            
            if (symbol && price > 0) {
              console.log('WebSocket: Received trade data:', { symbol, price, timestamp });
              
              setMarketData(prev => {
                const newMap = new Map(prev);
                
                // For trade data, use the trade price as both bid and ask with small spread
                const spread = price * 0.0001; // 0.01% spread
                const bid = price - spread;
                const ask = price + spread;
                
                newMap.set(symbol, {
                  symbol,
                  bid,
                  ask,
                  timestamp
                });
                
                return newMap;
              });
            }
          }
          // Legacy format support
          else if (data.symbol || data.price) {
            const symbol = data.symbol;
            const price = parseFloat(data.price || 0);
            
            if (symbol && price > 0) {
              setMarketData(prev => {
                const newMap = new Map(prev);
                
                // For trade data, use the trade price as both bid and ask with small spread
                const spread = price * 0.0001; // 0.01% spread
                const bid = price - spread;
                const ask = price + spread;
                
                newMap.set(symbol, {
                  symbol,
                  bid,
                  ask,
                  timestamp: Date.now()
                });
                
                return newMap;
              });
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', {
          type: event.type,
          target: event.target,
          readyState: wsRef.current?.readyState,
          url: wsRef.current?.url,
          error: event
        });
        setError('WebSocket connection error');
      };

    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setError('Failed to establish WebSocket connection');
    }
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing subscription');
      symbols.forEach(symbol => subscribedSymbols.current.add(symbol));
      return;
    }

    const message: WebSocketMessage = {
      op: 'subscribe',
      symbols: symbols
    };

    wsRef.current.send(JSON.stringify(message));
    symbols.forEach(symbol => subscribedSymbols.current.add(symbol));
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      symbols.forEach(symbol => subscribedSymbols.current.delete(symbol));
      return;
    }

    const message: WebSocketMessage = {
      op: 'unsubscribe',
      symbols: symbols
    };

    wsRef.current.send(JSON.stringify(message));
    symbols.forEach(symbol => subscribedSymbols.current.delete(symbol));
  }, []);

  useEffect(() => {
    connect();

    // Subscribe to initial symbols if provided
    if (initialSymbols.length > 0) {
      initialSymbols.forEach(symbol => subscribedSymbols.current.add(symbol));
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
    };
  }, [connect, initialSymbols]);

  return {
    marketData,
    isConnected,
    error,
    subscribe,
    unsubscribe
  };
};
