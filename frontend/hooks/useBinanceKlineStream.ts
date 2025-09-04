"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandlestickData, Time } from 'lightweight-charts';

interface BinanceKlineData {
  e: string;           // Event type
  E: number;          // Event time
  s: string;          // Symbol
  k: {
    t: number;        // Kline start time
    T: number;        // Kline close time
    s: string;        // Symbol
    i: string;        // Interval
    f: number;        // First trade ID
    L: number;        // Last trade ID
    o: string;        // Open price
    c: string;        // Close price
    h: string;        // High price
    l: string;        // Low price
    v: string;        // Base asset volume
    n: number;        // Number of trades
    x: boolean;       // Is this kline closed?
    q: string;        // Quote asset volume
    V: string;        // Taker buy base asset volume
    Q: string;        // Taker buy quote asset volume
    B: string;        // Ignore
  };
}

interface UseBinanceKlineStreamOptions {
  symbol: string;
  interval: string;
  enabled?: boolean;
}

// Map internal timeframes to Binance intervals
const timeframeMap: { [key: string]: string } = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '8h': '8h',
  '12h': '12h',
  '1d': '1d',
  '3d': '3d',
  '1w': '1w',
  '1M': '1M',
};

// Map our symbols to Binance symbols (using actual Binance trading pairs)
const symbolMap: { [key: string]: string } = {
  'BTCUSDT': 'btcusdt',
  'ETHUSDT': 'ethusdt', 
  'SOLUSDT': 'solusdt',
  'XRPUSDT': 'xrpusdt',
  'ADAUSDT': 'adausdt',
  'DOTUSDT': 'dotusdt',
  'LINKUSDT': 'linkusdt',
  'LTCUSDT': 'ltcusdt',
  'BNBUSDT': 'bnbusdt',
  // Map any non-standard symbols to closest Binance equivalent
  'BTCFDUSD': 'btcusdt',
  'ETHFDUSD': 'ethusdt',
  'ETHUSDC': 'ethusdt',
  'XRPUSDC': 'xrpusdt',
  'SOLFDUSD': 'solusdt',
  'SOLUSDC': 'solusdt',
  'USDCUSDT': 'usdcusdt',
};

export function useBinanceKlineStream({ symbol, interval, enabled = true }: UseBinanceKlineStreamOptions) {
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Convert our internal symbol to Binance format
  const getBinanceSymbol = useCallback((sym: string): string => {
    return symbolMap[sym.toUpperCase()] || sym.toLowerCase();
  }, []);

  // Convert our interval to Binance format
  const getBinanceInterval = useCallback((int: string): string => {
    return timeframeMap[int] || '1m';
  }, []);

  // Convert Binance kline data to chart format
  const convertKlineToChartData = useCallback((kline: BinanceKlineData['k']): CandlestickData => {
    return {
      time: Math.floor(kline.t / 1000) as Time, // Convert to seconds
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
    };
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const binanceSymbol = getBinanceSymbol(symbol);
      const binanceInterval = getBinanceInterval(interval);
      const streamName = `${binanceSymbol}@kline_${binanceInterval}`;
      const wsUrl = `wss://stream.binance.com:9443/ws/${streamName}`;
      
      console.log('Connecting to Binance kline stream:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to Binance kline stream');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: BinanceKlineData = JSON.parse(event.data);
          
          if (data.e === 'kline' && data.k) {
            const newCandle = convertKlineToChartData(data.k);
            const candleTime = newCandle.time;
            
            setCandleData(prevData => {
              // If this is the first candle, just add it
              if (prevData.length === 0) {
                return [newCandle];
              }

              const lastCandle = prevData[prevData.length - 1];
              const lastCandleTime = typeof lastCandle.time === 'number' ? lastCandle.time : Number(lastCandle.time);
              const currentCandleTime = typeof candleTime === 'number' ? candleTime : Number(candleTime);

              // If this update is for the current candle (same time), update it
              if (currentCandleTime === lastCandleTime) {
                return [...prevData.slice(0, -1), newCandle];
              }
              // If this is a new candle (newer time), add it
              else if (currentCandleTime > lastCandleTime) {
                return [...prevData, newCandle];
              }
              
              // Ignore older candles
              return prevData;
            });
          }
        } catch (err) {
          console.error('Error parsing Binance kline message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Binance kline stream disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          console.log(`Reconnecting to Binance in ${timeout}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('Binance kline stream error:', event);
        setError('Failed to connect to Binance kline stream');
      };

    } catch (err) {
      console.error('Failed to establish Binance kline stream:', err);
      setError('Failed to establish kline stream connection');
    }
  }, [enabled, symbol, interval, getBinanceSymbol, getBinanceInterval, convertKlineToChartData]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setCandleData([]);
  }, []);

  // Connect/disconnect when parameters change
  useEffect(() => {
    console.log('useBinanceKlineStream: Parameters changed:', { enabled, symbol, interval });
    
    if (enabled) {
      // Clear existing data when switching symbols/intervals
      console.log('useBinanceKlineStream: Clearing existing data and reconnecting');
      setCandleData([]);
      setError(null);
      
      // Disconnect existing connection
      disconnect();
      
      // Small delay to ensure clean disconnect before reconnecting
      const timeoutId = setTimeout(() => {
        connect();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        disconnect();
      };
    } else {
      console.log('useBinanceKlineStream: Disabled, disconnecting');
      disconnect();
    }
  }, [enabled, symbol, interval, connect, disconnect]);

  return {
    candleData,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
