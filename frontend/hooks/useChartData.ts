"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import { useBinanceKlineStream } from './useBinanceKlineStream';
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
    const [hasHistoricalData, setHasHistoricalData] = useState<boolean | null>(null);
    
    // WebSocket hook for real-time data (fallback for trade updates)
    const { marketData, isConnected, subscribe, unsubscribe } = useWebSocket();
    
    // Binance kline stream for when no historical data is available
    const { 
        candleData: binanceData,
        isConnected: binanceConnected,
        error: binanceError
    } = useBinanceKlineStream({
        symbol,
        interval: timeframe,
        enabled: hasHistoricalData === false && enableRealTime
    });
    
    // Track current candle for real-time updates
    const currentCandleRef = useRef<CandlestickData | null>(null);
    const timeframeSecondsRef = useRef<number>(60); // Default to 1 minute
    const previousSymbolRef = useRef<string>('');
    const binanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Use Binance data when no historical data is available
    useEffect(() => {
        if (hasHistoricalData === false) {
            if (binanceError) {
                console.error('useChartData: Binance stream error:', binanceError);
                setError(`Live data unavailable: ${binanceError}`);
                setLoading(false);
                return;
            }

            if (binanceData.length > 0) {
                console.log('useChartData: Using Binance kline data, received', binanceData.length, 'candles for', symbol);
                setData(binanceData);
                setLoading(false);
                setError(null);
                
                // Clear any existing timeout
                if (binanceTimeoutRef.current) {
                    clearTimeout(binanceTimeoutRef.current);
                    binanceTimeoutRef.current = null;
                }
            } else if (binanceConnected) {
                console.log('useChartData: Connected to Binance, waiting for kline data for', symbol);
                
                // Set a timeout to show error if no data arrives within 10 seconds
                if (binanceTimeoutRef.current) {
                    clearTimeout(binanceTimeoutRef.current);
                }
                binanceTimeoutRef.current = setTimeout(() => {
                    console.log('useChartData: Timeout waiting for Binance data');
                    setError('No live data received. Please try a different symbol or timeframe.');
                    setLoading(false);
                }, 10000);
            } else {
                console.log('useChartData: Connecting to Binance stream for', symbol);
                // Keep loading state while connecting
            }
        }
    }, [binanceData, hasHistoricalData, symbol, binanceError, binanceConnected]);
    
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

    // Subscribe to WebSocket for real-time updates (only when we have historical data)
    useEffect(() => {
        console.log('useChartData: WebSocket subscription effect triggered:', { symbol, enableRealTime, isConnected, hasHistoricalData });
        
        if (!enableRealTime || !isConnected || hasHistoricalData !== true) {
            // Unsubscribe if we shouldn't be using WebSocket
            if (previousSymbolRef.current) {
                console.log('useChartData: Unsubscribing from WebSocket:', previousSymbolRef.current);
                unsubscribe([previousSymbolRef.current]);
                previousSymbolRef.current = '';
            }
            return;
        }
        
        // Unsubscribe from previous symbol if it exists and is different
        if (previousSymbolRef.current && previousSymbolRef.current !== symbol) {
            console.log('useChartData: Unsubscribing from previous symbol:', previousSymbolRef.current);
            unsubscribe([previousSymbolRef.current]);
        }
        
        // Subscribe to new symbol
        if (symbol) {
            console.log('useChartData: Subscribing to WebSocket for symbol:', symbol);
            subscribe([symbol]);
            previousSymbolRef.current = symbol;
            
            // Reset current candle reference when symbol changes
            currentCandleRef.current = null;
        }
        
        // Cleanup function to unsubscribe when component unmounts or dependencies change
        return () => {
            if (symbol && hasHistoricalData === true) {
                console.log('useChartData: Cleanup - unsubscribing from:', symbol);
                unsubscribe([symbol]);
            }
        };
    }, [symbol, enableRealTime, isConnected, hasHistoricalData, subscribe, unsubscribe]);

    // Handle real-time price updates from WebSocket (only when we have historical data)
    useEffect(() => {
        if (!enableRealTime || !symbol || hasHistoricalData !== true) return;
        
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
    }, [marketData, symbol, timeframe, enableRealTime, hasHistoricalData]);

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
                setHasHistoricalData(true);
                console.log(`useChartData: Loaded ${chartData.length} historical candles for ${symbol}`);
            } else {
                console.log('useChartData: No historical data available, will use Binance kline stream');
                setHasHistoricalData(false);
                setData([]);
            }
        } catch (err) {
            console.error('useChartData: Error fetching chart data:', err);
            console.log('useChartData: Falling back to Binance kline stream');
            setError(null); // Don't show error, just use live data
            setHasHistoricalData(false);
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
        setHasHistoricalData(null); // Reset historical data flag
        currentCandleRef.current = null;
        
        // Clear any existing Binance timeout
        if (binanceTimeoutRef.current) {
            clearTimeout(binanceTimeoutRef.current);
            binanceTimeoutRef.current = null;
        }
        
        // Reset previous symbol reference to ensure clean WebSocket subscription management
        if (previousSymbolRef.current) {
            unsubscribe([previousSymbolRef.current]);
            previousSymbolRef.current = '';
        }
    }, [symbol, timeframe, unsubscribe]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (binanceTimeoutRef.current) {
                clearTimeout(binanceTimeoutRef.current);
            }
        };
    }, []);

    return {
        data,
        loading,
        error,
        refetch: fetchHistoricalData
    };
}
