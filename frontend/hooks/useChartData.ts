"use client"

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

export function useChartData({ symbol, timeframe, enableRealTime = true }: UseChartDataOptions) {
    const [data, setData] = useState<CandlestickData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // WebSocket hook for real-time data
    const { marketData, isConnected, subscribe, unsubscribe } = useWebSocket();
    
    // Track current candle for real-time updates
    const currentCandleRef = useRef<CandlestickData | null>(null);
    const timeframeSecondsRef = useRef<number>(60); // Default to 1 minute
    const previousSymbolRef = useRef<string>('');
    
    // Convert timeframe string to seconds
    const getTimeframeSeconds = useCallback((tf: string): number => {
        const timeframeMap: { [key: string]: number } = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '30m': 1800,
            '1h': 3600,
            '1d': 86400,
            '1w': 604800,
        };
        return timeframeMap[tf] || 60;
    }, []);
    
    // Update timeframe seconds when timeframe changes
    useEffect(() => {
        timeframeSecondsRef.current = getTimeframeSeconds(timeframe);
    }, [timeframe, getTimeframeSeconds]);

    // Convert backend candle data to lightweight-charts format
    const convertToChartData = useCallback((candles: CandleResponse[]): CandlestickData[] => {
        return candles.map(candle => ({
            time: candle.timestamp as Time,
            open: candle.open / Math.pow(10, candle.decimal),
            high: candle.high / Math.pow(10, candle.decimal),
            low: candle.low / Math.pow(10, candle.decimal),
            close: candle.close / Math.pow(10, candle.decimal),
        }));
    }, []);

    // Subscribe to WebSocket for real-time updates and handle symbol changes
    useEffect(() => {
        console.log('useChartData: WebSocket subscription effect triggered:', { symbol, enableRealTime, isConnected });
        
        if (!enableRealTime || !isConnected) return;
        
        // Unsubscribe from previous symbol if it exists and is different
        if (previousSymbolRef.current && previousSymbolRef.current !== symbol) {
            console.log('useChartData: Unsubscribing from previous symbol:', previousSymbolRef.current);
            unsubscribe([previousSymbolRef.current]);
        }
        
        // Subscribe to new symbol and clear data for symbol change
        if (symbol) {
            console.log('useChartData: Subscribing to new symbol:', symbol);
            subscribe([symbol]);
            previousSymbolRef.current = symbol;
            
            // Reset current candle reference when symbol changes
            currentCandleRef.current = null;
        }
        
        // Cleanup function to unsubscribe when component unmounts or symbol changes
        return () => {
            if (symbol) {
                console.log('useChartData: Cleanup - unsubscribing from:', symbol);
                unsubscribe([symbol]);
            }
        };
    }, [symbol, enableRealTime, isConnected, subscribe, unsubscribe]);

    // Handle real-time price updates from WebSocket
    useEffect(() => {
        if (!enableRealTime || !symbol) return;
        
        const liveData = marketData.get(symbol);
        if (!liveData || !liveData.timestamp) return;
        
        const currentPrice = (liveData.bid + liveData.ask) / 2;
        const timestamp = Math.floor(liveData.timestamp / 1000); // Convert to seconds
        const candleTime = Math.floor(timestamp / timeframeSecondsRef.current) * timeframeSecondsRef.current;
        
        setData(prevData => {
            if (prevData.length === 0) return prevData;
            
            const lastCandle = prevData[prevData.length - 1];
            const lastCandleTime = typeof lastCandle.time === 'number' ? lastCandle.time : Number(lastCandle.time);
            
            // If this price update belongs to the current candle period, update it
            if (candleTime === lastCandleTime) {
                const updatedCandle: CandlestickData = {
                    time: candleTime as Time,
                    open: lastCandle.open,
                    high: Math.max(lastCandle.high, currentPrice),
                    low: Math.min(lastCandle.low, currentPrice),
                    close: currentPrice,
                };
                
                currentCandleRef.current = updatedCandle;
                return [...prevData.slice(0, -1), updatedCandle];
            }
            // If this is a new candle period, create a new candle
            else if (candleTime > lastCandleTime) {
                const newCandle: CandlestickData = {
                    time: candleTime as Time,
                    open: currentPrice,
                    high: currentPrice,
                    low: currentPrice,
                    close: currentPrice,
                };
                
                currentCandleRef.current = newCandle;
                return [...prevData, newCandle];
            }
            
            return prevData;
        });
    }, [marketData, symbol, timeframe, enableRealTime]);

    // Fetch historical data from TSDB
    const fetchHistoricalData = useCallback(async () => {
        if (!symbol || !timeframe) {
            console.log('useChartData: Missing symbol or timeframe', { symbol, timeframe });
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Calculate appropriate time range based on timeframe
            const now = Math.floor(Date.now() / 1000);
            
            // Conservative time ranges to stay within backend limits
            const timeRanges = {
                '1s': 23 * 60 * 60, // 23 hours (backend allows 24 hours)
                '1m': 29 * 24 * 60 * 60, // 29 days (backend allows 30 days)
                '5m': 89 * 24 * 60 * 60, // 89 days (backend allows 90 days)
                '15m': 179 * 24 * 60 * 60, // 179 days (backend allows 180 days)
                '30m': 364 * 24 * 60 * 60, // 364 days (backend allows 365 days)
                '1h': 2 * 364 * 24 * 60 * 60, // ~2 years (backend allows 2 years)
                '1H': 2 * 364 * 24 * 60 * 60, // ~2 years (backend allows 2 years)
                '1d': 5 * 364 * 24 * 60 * 60, // ~5 years (backend allows 5 years)
                '1D': 5 * 364 * 24 * 60 * 60, // ~5 years (backend allows 5 years)
                '1w': 10 * 364 * 24 * 60 * 60, // ~10 years (backend allows 10 years)
                '1W': 10 * 364 * 24 * 60 * 60, // ~10 years (backend allows 10 years)
            };
            
            const timeRange = timeRanges[timeframe as keyof typeof timeRanges] || 24 * 60 * 60; // Default to 1 day
            const startTime = now - timeRange;
            const endTime = now;
            
            const response = await api.getCandles(symbol, timeframe, startTime, endTime);
            
            if (response.candles && Array.isArray(response.candles)) {
                const chartData = convertToChartData(response.candles);
                setData(chartData);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error('useChartData: Error fetching chart data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [symbol, timeframe, convertToChartData]);

    // Initial data fetch
    useEffect(() => {
        fetchHistoricalData();
    }, [fetchHistoricalData]);

    // Clear data immediately when symbol or timeframe changes for better UX
    useEffect(() => {
        console.log('useChartData: Symbol or timeframe changed:', { symbol, timeframe });
        setData([]);
        setLoading(true);
        setError(null);
        currentCandleRef.current = null;
    }, [symbol, timeframe]);

    return {
        data,
        loading,
        error,
        refetch: fetchHistoricalData
    };
}
