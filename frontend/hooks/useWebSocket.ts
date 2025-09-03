import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  op: string;
  symbols?: string[];
  [key: string]: any;
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
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
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

          // Handle market data updates
          if (data.symbol && (data.bid !== undefined || data.ask !== undefined)) {
            setMarketData(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(data.symbol) || { symbol: data.symbol, bid: 0, ask: 0 };
              
              newMap.set(data.symbol, {
                ...existing,
                bid: data.bid !== undefined ? data.bid : existing.bid,
                ask: data.ask !== undefined ? data.ask : existing.ask,
                timestamp: Date.now()
              });
              
              return newMap;
            });
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
        console.error('WebSocket error:', event);
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
  }, [connect]);

  return {
    marketData,
    isConnected,
    error,
    subscribe,
    unsubscribe
  };
};
