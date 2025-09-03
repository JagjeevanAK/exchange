"use client"

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import {
    CandlestickSeries,
    Chart,
    TimeScale,
    TimeScaleFitContentTrigger,
} from "lightweight-charts-react-components";
import type { CandlestickData } from "lightweight-charts";
import { ColorType } from "lightweight-charts";
import { useChartData } from "@/hooks/useChartData";
import { useTradingContext } from "./TradingContext";

export default function MainChart() {
    const { selectedSymbol, timeInterval } = useTradingContext();
    const { data, loading, error } = useChartData({
        symbol: selectedSymbol,
        timeframe: timeInterval,
        enableRealTime: true
    });
    
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 600 });
    const { resolvedTheme } = useTheme();
    
    // Get the current theme (resolvedTheme accounts for 'system' preference)
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        const updateDimensions = () => {
            if (chartContainerRef.current) {
                const { clientWidth, clientHeight } = chartContainerRef.current;
                // Add minimum dimensions to prevent zero-size issues
                setChartDimensions({
                    width: Math.max(clientWidth, 300),
                    height: Math.max(clientHeight, 200),
                });
            }
        };

        // Use setTimeout to ensure the DOM is fully rendered
        const timeoutId = setTimeout(updateDimensions, 100);

        // Add resize observer to watch for size changes
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };
    }, []);

    // Show loading or error states
    if (loading) {
        return (
            <div ref={chartContainerRef} className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded">
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Loading chart data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div ref={chartContainerRef} className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded">
                <div className="flex items-center justify-center h-full">
                    <p className="text-red-500">Error loading chart: {error}</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div ref={chartContainerRef} className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded">
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No chart data available for {selectedSymbol}</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={chartContainerRef} className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded">
            {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
                <Chart
                    options={{
                        width: chartDimensions.width,
                        height: chartDimensions.height,
                        layout: {
                            background: {
                                type: ColorType.Solid,
                                color: isDark ? '#0c0a09' : '#ffffff', // dark:stone-950 : white
                            },
                            textColor: isDark ? '#f5f5f4' : '#0c0a09', // dark:stone-100 : stone-950
                        },
                        grid: {
                            vertLines: {
                                color: isDark ? '#292524' : '#e7e5e4', // dark:stone-800 : stone-200
                            },
                            horzLines: {
                                color: isDark ? '#292524' : '#e7e5e4', // dark:stone-800 : stone-200
                            },
                        },
                        timeScale: {
                            borderColor: isDark ? '#44403c' : '#d6d3d1', // dark:stone-700 : stone-300
                        },
                        rightPriceScale: {
                            borderColor: isDark ? '#44403c' : '#d6d3d1', // dark:stone-700 : stone-300
                        },
                    }}
                >
                    <CandlestickSeries 
                        data={data}
                        options={{
                            upColor: '#079981', // Custom green color
                            downColor: '#F23645', // Custom red color
                            borderUpColor: '#079981',
                            borderDownColor: '#F23645',
                            wickUpColor: '#079981',
                            wickDownColor: '#F23645',
                            // Add minimum candle body size for better visibility
                            priceFormat: {
                                type: 'price',
                                precision: 2,
                                minMove: 0.01,
                            },
                        }}
                    />
                    <TimeScale>
                        <TimeScaleFitContentTrigger deps={[]} />
                    </TimeScale>
                </Chart>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Loading chart...</p>
                </div>
            )}
        </div>
    );
};