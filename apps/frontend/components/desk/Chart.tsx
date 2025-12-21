'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { CandlestickSeries, Chart, TimeScale } from 'lightweight-charts-react-components';
import { ColorType } from 'lightweight-charts';
import { useChartData } from '@/hooks/useChartData';
import { useTradingContext } from './TradingContext';

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
        className="w-full h-full min-h-[400px] bg-background border border-dashed border-border rounded"
      >
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground mb-2">Loading chart data for {selectedSymbol}...</p>
          <p className="text-sm text-muted-foreground">{timeInterval} timeframe</p>
        </div>
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
