"use client"

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
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

    // Fetch historical data from TSDB
    const fetchHistoricalData = useCallback(async () => {
        if (!symbol || !timeframe) {
            console.log('useChartData: Missing symbol or timeframe', { symbol, timeframe });
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Get data for an appropriate time range based on timeframe
            const now = Math.floor(Date.now() / 1000);
            let startTime = now - (24 * 60 * 60); // Default 24 hours ago

            // Adjust time range based on timeframe for better charts
            switch (timeframe) {
                case '1s':
                    startTime = now - (60 * 60); // 1 hour for 1s
                    break;
                case '1m':
                    startTime = now - (6 * 60 * 60); // 6 hours for 1m
                    break;
                case '5m':
                    startTime = now - (24 * 60 * 60); // 24 hours for 5m
                    break;
                case '15m':
                    startTime = now - (3 * 24 * 60 * 60); // 3 days for 15m
                    break;
                case '30m':
                    startTime = now - (7 * 24 * 60 * 60); // 7 days for 30m
                    break;
                case '1h':
                case '1H':
                    startTime = now - (30 * 24 * 60 * 60); // 30 days for 1h
                    break;
                case '1d':
                case '1D':
                    startTime = now - (365 * 24 * 60 * 60); // 1 year for 1d
                    break;
                case '1w':
                case '1W':
                    startTime = now - (2 * 365 * 24 * 60 * 60); // 2 years for 1w
                    break;
                default:
                    console.warn(`useChartData: Unknown timeframe ${timeframe}, using default 24h range`);
                    startTime = now - (24 * 60 * 60); // Default 24 hours
            }

            console.log(`useChartData: Fetching historical data for ${symbol} (${timeframe}) from ${new Date(startTime * 1000)} to ${new Date(now * 1000)}`);
            
            const response = await api.getCandles(symbol, timeframe, startTime, now);
            console.log('useChartData: API response:', response);
            
            if (response.candles && Array.isArray(response.candles)) {
                const chartData = convertToChartData(response.candles);
                console.log(`useChartData: Loaded ${chartData.length} historical candles for ${symbol}:`, chartData.slice(0, 3));
                setData(chartData);
            } else {
                console.log(`useChartData: No candle data received for ${symbol}. Response:`, response);
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

    // Fetch latest candle for real-time updates
    const updateLatestCandle = useCallback(async () => {
        if (!symbol || !timeframe || !enableRealTime) return;

        try {
            const response = await api.getLatestCandle(symbol, timeframe);
            
            if (response.candle) {
                const newCandle = convertToChartData([response.candle])[0];
                
                setData(prevData => {
                    if (prevData.length === 0) return [newCandle];
                    
                    const lastCandle = prevData[prevData.length - 1];
                    
                    // If it's the same time period, update the last candle
                    if (lastCandle.time === newCandle.time) {
                        return [...prevData.slice(0, -1), newCandle];
                    } else {
                        // If it's a new time period, add the new candle
                        return [...prevData, newCandle];
                    }
                });
            }
        } catch (err) {
            console.error('useChartData: Error updating latest candle:', err);
            
            // Check if it's an authentication error
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('Authentication required') || errorMessage.includes('Session expired')) {
                setError(errorMessage);
                if (typeof window !== 'undefined') {
                    console.warn('Authentication required for real-time updates');
                }
            }
        }
    }, [symbol, timeframe, enableRealTime, convertToChartData]);

    // Initial data fetch
    useEffect(() => {
        fetchHistoricalData();
    }, [fetchHistoricalData]);

    // Real-time updates via polling
    useEffect(() => {
        if (!enableRealTime) return;

        const interval = setInterval(updateLatestCandle, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [updateLatestCandle, enableRealTime]);

    return {
        data,
        loading,
        error,
        refetch: fetchHistoricalData
    };
}
