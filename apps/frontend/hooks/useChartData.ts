'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import type { CandlestickData, Time } from 'lightweight-charts';

interface CandleResponse {
  timestamp: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  decimal: number;
}

interface UseChartDataOptions {
  symbol: string;
  timeframe: string;
  enableRealTime?: boolean;
}

/**
 * useChartData - Fetches historical candle data from backend (TSDB) and
 * updates with live trade data from WS-Gateway.
 *
 * Data flow:
 * 1. Historical data: Backend API → TimescaleDB materialized views
 * 2. Live data: WS-Gateway → Redis → Poller (from Binance trades)
 */
export function useChartData({ symbol, timeframe, enableRealTime = true }: UseChartDataOptions) {
  const [data, setData] = useState<CandlestickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket hook for real-time trade data from WS-Gateway
  const { marketData, isConnected, subscribe, unsubscribe } = useWebSocket();

  // Track current candle for real-time updates
  const currentCandleRef = useRef<CandlestickData | null>(null);
  const timeframeSecondsRef = useRef<number>(60); // Default to 1 minute
  const previousSymbolRef = useRef<string>('');
  const dataLoadedRef = useRef<boolean>(false);

  // Store subscribe/unsubscribe in refs to avoid dependency issues
  const subscribeRef = useRef(subscribe);
  const unsubscribeRef = useRef(unsubscribe);

  useEffect(() => {
    subscribeRef.current = subscribe;
    unsubscribeRef.current = unsubscribe;
  }, [subscribe, unsubscribe]);

  // Convert timeframe string to seconds
  const getTimeframeSeconds = useCallback((tf: string): number => {
    const timeframeMap: { [key: string]: number } = {
      '1s': 1,
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '1H': 3600,
      '1d': 86400,
      '1D': 86400,
      '1w': 604800,
      '1W': 604800,
    };
    return timeframeMap[tf] || 60;
  }, []);

  // Update timeframe seconds when timeframe changes
  useEffect(() => {
    timeframeSecondsRef.current = getTimeframeSeconds(timeframe);
  }, [timeframe, getTimeframeSeconds]);

  // Convert backend candle data to lightweight-charts format
  const convertToChartData = useCallback((candles: CandleResponse[]): CandlestickData[] => {
    return candles.map((candle) => ({
      time: candle.timestamp as Time,
      open: candle.open / Math.pow(10, candle.decimal),
      high: candle.high / Math.pow(10, candle.decimal),
      low: candle.low / Math.pow(10, candle.decimal),
      close: candle.close / Math.pow(10, candle.decimal),
    }));
  }, []);

  // Subscribe to WebSocket for real-time trade updates
  useEffect(() => {
    if (!enableRealTime || !isConnected) {
      return;
    }

    // Unsubscribe from previous symbol if different
    if (previousSymbolRef.current && previousSymbolRef.current !== symbol) {
      console.log('useChartData: Unsubscribing from previous symbol:', previousSymbolRef.current);
      unsubscribeRef.current([previousSymbolRef.current]);
    }

    // Subscribe to new symbol
    if (symbol) {
      console.log('useChartData: Subscribing to WS-Gateway for symbol:', symbol);
      subscribeRef.current([symbol]);
      previousSymbolRef.current = symbol;
      currentCandleRef.current = null;
    }

    return () => {
      if (symbol) {
        console.log('useChartData: Cleanup - unsubscribing from:', symbol);
        unsubscribeRef.current([symbol]);
      }
    };
  }, [symbol, enableRealTime, isConnected]);

  // Handle real-time trade updates from WS-Gateway
  // Builds/updates candles from individual trade data
  useEffect(() => {
    if (!enableRealTime || !symbol || !dataLoadedRef.current) return;

    const liveData = marketData.get(symbol);
    if (!liveData || !liveData.timestamp) return;

    // Get trade price (midpoint of bid/ask which are calculated from trade price)
    const tradePrice = (liveData.bid + liveData.ask) / 2;
    const timestamp = Math.floor(liveData.timestamp / 1000); // Convert to seconds
    const candleTime =
      Math.floor(timestamp / timeframeSecondsRef.current) * timeframeSecondsRef.current;

    setData((prevData) => {
      if (prevData.length === 0) {
        // No historical data, create first candle from live trade
        const newCandle: CandlestickData = {
          time: candleTime as Time,
          open: tradePrice,
          high: tradePrice,
          low: tradePrice,
          close: tradePrice,
        };
        currentCandleRef.current = newCandle;
        return [newCandle];
      }

      const lastCandle = prevData[prevData.length - 1];
      const lastCandleTime =
        typeof lastCandle.time === 'number' ? lastCandle.time : Number(lastCandle.time);

      // If this trade belongs to the current candle period, update it
      if (candleTime === lastCandleTime) {
        const updatedCandle: CandlestickData = {
          time: candleTime as Time,
          open: lastCandle.open,
          high: Math.max(lastCandle.high, tradePrice),
          low: Math.min(lastCandle.low, tradePrice),
          close: tradePrice,
        };

        currentCandleRef.current = updatedCandle;
        return [...prevData.slice(0, -1), updatedCandle];
      }
      // If this is a new candle period, create a new candle
      else if (candleTime > lastCandleTime) {
        // Use previous candle's close as new candle's open for continuity
        const newCandle: CandlestickData = {
          time: candleTime as Time,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, tradePrice),
          low: Math.min(lastCandle.close, tradePrice),
          close: tradePrice,
        };

        currentCandleRef.current = newCandle;
        return [...prevData, newCandle];
      }

      return prevData;
    });
  }, [marketData, symbol, enableRealTime]);

  // Fetch historical data from backend (TSDB materialized views)
  const fetchHistoricalData = useCallback(async () => {
    if (!symbol || !timeframe) {
      console.log('useChartData: Missing symbol or timeframe', { symbol, timeframe });
      return;
    }

    // Store the symbol/timeframe we're fetching for to handle race conditions
    const fetchSymbol = symbol;
    const fetchTimeframe = timeframe;

    try {
      setLoading(true);
      setError(null);
      dataLoadedRef.current = false;

      // Calculate appropriate time range based on timeframe
      const now = Math.floor(Date.now() / 1000);

      // Time ranges matching backend limits - fetch reasonable amount of data
      const timeRanges: { [key: string]: number } = {
        '1s': 1 * 60 * 60, // 1 hour for 1s candles (3600 candles max)
        '1m': 24 * 60 * 60, // 1 day for 1m candles (1440 candles)
        '5m': 3 * 24 * 60 * 60, // 3 days for 5m candles
        '15m': 7 * 24 * 60 * 60, // 7 days for 15m candles
        '30m': 14 * 24 * 60 * 60, // 14 days for 30m candles
        '1h': 30 * 24 * 60 * 60, // 30 days for 1h candles
        '1H': 30 * 24 * 60 * 60,
        '1d': 365 * 24 * 60 * 60, // 1 year for 1d candles
        '1D': 365 * 24 * 60 * 60,
        '1w': 2 * 365 * 24 * 60 * 60, // 2 years for 1w candles
        '1W': 2 * 365 * 24 * 60 * 60,
      };

      const timeRange = timeRanges[fetchTimeframe] || 24 * 60 * 60;
      const startTime = now - timeRange;
      const endTime = now;

      console.log(
        `useChartData: Fetching historical candles from backend for ${fetchSymbol} ${fetchTimeframe}`
      );
      const response = await api.getCandles(fetchSymbol, fetchTimeframe, startTime, endTime);

      // Check if symbol/timeframe changed while we were fetching (race condition guard)
      if (fetchSymbol !== symbol || fetchTimeframe !== timeframe) {
        console.log('useChartData: Symbol/timeframe changed during fetch, discarding stale data');
        return;
      }

      if (response.candles && Array.isArray(response.candles) && response.candles.length > 0) {
        const chartData = convertToChartData(response.candles);
        setData(chartData);
        dataLoadedRef.current = true;
        console.log(
          `useChartData: Loaded ${chartData.length} historical candles from TSDB for ${fetchSymbol}`
        );
      } else {
        console.log('useChartData: No historical data in TSDB for', fetchSymbol);
        setData([]);
        dataLoadedRef.current = true; // Still allow live updates
        // Not setting error - will build chart from live data
      }
    } catch (err) {
      // Check if symbol/timeframe changed while we were fetching
      if (fetchSymbol !== symbol || fetchTimeframe !== timeframe) {
        console.log('useChartData: Symbol/timeframe changed during fetch, ignoring error');
        return;
      }
      console.error('useChartData: Error fetching historical data from backend:', err);
      setError('Failed to load historical data. Waiting for live updates...');
      setData([]);
      dataLoadedRef.current = true; // Allow live updates even on error
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, convertToChartData]);

  // Handle symbol/timeframe changes - clear state and fetch new data
  useEffect(() => {
    console.log('useChartData: Symbol or timeframe changed:', { symbol, timeframe });

    // Reset state for new symbol/timeframe
    setData([]);
    setLoading(true);
    setError(null);
    currentCandleRef.current = null;
    dataLoadedRef.current = false;

    // Unsubscribe from previous symbol
    if (previousSymbolRef.current && previousSymbolRef.current !== symbol) {
      console.log('useChartData: Unsubscribing from previous symbol:', previousSymbolRef.current);
      unsubscribeRef.current([previousSymbolRef.current]);
    }

    // Fetch historical data for the new symbol/timeframe
    fetchHistoricalData();

    // Note: previousSymbolRef is updated in the WebSocket subscription effect
  }, [symbol, timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    error,
    isConnected,
    refetch: fetchHistoricalData,
  };
}
