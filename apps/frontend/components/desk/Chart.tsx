'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { CandlestickSeries, Chart, TimeScale } from 'lightweight-charts-react-components';
import { ColorType } from 'lightweight-charts';
import { useChartData } from '@/hooks/useChartData';
import { useTradingContext } from './TradingContext';
import { Skeleton } from '@/components/ui/skeleton';

function ChartSkeleton() {
  // Fixed heights to avoid hydration mismatch (no Math.random())
  const barHeights = [
    45, 65, 35, 70, 50, 60, 40, 75, 55, 30, 68, 42, 58, 48, 72, 38, 62, 52, 44, 66, 36, 54, 46, 70,
    32, 64, 50, 56, 42, 60,
  ];

  return (
    <div className="absolute inset-0 bg-background border border-dashed border-border rounded p-4 z-10">
      <div className="flex flex-col h-full">
        {/* Chart header skeleton */}
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Chart area skeleton */}
        <div className="flex-1 flex gap-2">
          {/* Y-axis */}
          <div className="flex flex-col justify-between py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
          {/* Candlestick area */}
          <div className="flex-1 flex items-end gap-1 pb-8">
            {barHeights.map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <Skeleton className="w-full" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>
        {/* X-axis skeleton */}
        <div className="flex justify-between pt-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export default function MainChart() {
  const { selectedSymbol, timeInterval } = useTradingContext();
  const { data, loading, error, isConnected } = useChartData({
    symbol: selectedSymbol,
    timeframe: timeInterval,
    enableRealTime: true,
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 600 });
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const { clientWidth, clientHeight } = chartContainerRef.current;
        setChartDimensions({
          width: Math.max(clientWidth, 300),
          height: Math.max(clientHeight, 200),
        });
      }
    };

    const timeoutId = setTimeout(updateDimensions, 100);
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  // Memoize chart options
  const chartOptions = useMemo(
    () => ({
      width: chartDimensions.width,
      height: chartDimensions.height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? '#0c0a09' : '#ffffff',
        },
        textColor: isDark ? '#f5f5f4' : '#0c0a09',
      },
      grid: {
        vertLines: {
          color: isDark ? '#292524' : '#e7e5e4',
        },
        horzLines: {
          color: isDark ? '#292524' : '#e7e5e4',
        },
      },
      timeScale: {
        borderColor: isDark ? '#44403c' : '#d6d3d1',
        timeVisible: true,
        secondsVisible: timeInterval === '1s' || timeInterval === '1m',
        rightOffset: 5,
        barSpacing: 30,
        minBarSpacing: 10,
      },
      rightPriceScale: {
        borderColor: isDark ? '#44403c' : '#d6d3d1',
        autoScale: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    }),
    [chartDimensions, isDark, timeInterval]
  );

  const candleOptions = useMemo(
    () => ({
      upColor: '#079981',
      downColor: '#F23645',
      borderUpColor: '#079981',
      borderDownColor: '#F23645',
      wickUpColor: '#079981',
      wickDownColor: '#F23645',
      priceFormat: {
        type: 'price' as const,
        precision: selectedSymbol.includes('BTC') ? 2 : 4,
        minMove: selectedSymbol.includes('BTC') ? 0.01 : 0.0001,
      },
    }),
    [selectedSymbol]
  );

  if (loading) {
    return (
      <div
        ref={chartContainerRef}
        className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded relative"
      >
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={chartContainerRef}
        className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded"
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">Error loading chart: {error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        ref={chartContainerRef}
        className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded"
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}
            ></div>
            <p className="text-muted-foreground">
              {isConnected ? 'Waiting for trade data...' : 'Connecting to live feed...'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            No historical data in TSDB for {selectedSymbol}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Timeframe: {timeInterval}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded relative"
    >
      {/* Live indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded text-xs">
        <div
          className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}
        ></div>
        <span className="text-muted-foreground">{isConnected ? 'LIVE' : 'CONNECTING'}</span>
      </div>

      {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
        <Chart options={chartOptions}>
          <CandlestickSeries data={data} options={candleOptions} />
          <TimeScale />
        </Chart>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      )}
    </div>
  );
}
