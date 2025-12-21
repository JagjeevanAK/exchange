import { useWebSocket } from '@/hooks/useWebSocket';
import { useState, useCallback, useEffect } from 'react';
import { getIcons } from '@/lib/utility';
import { useTradingContext } from './TradingContext';
import { Skeleton } from '@/components/ui/skeleton';

function PriceCardSkeleton() {
  return (
    <div className="border-r border-border border-dashed p-4 flex gap-3">
      <Skeleton className="w-32 h-24 rounded-sm" />
      <div className="border border-dashed border-border py-2 px-3 w-full flex flex-col justify-center gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

const PriceCard = () => {
  const { selectedSymbol } = useTradingContext();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { marketData, isConnected, subscribe } = useWebSocket();

  const handleTradeUpdate = useCallback((marketData: any) => {
    if (marketData.bid && marketData.ask) {
      // Use mid price as current price
      const midPrice = (marketData.bid + marketData.ask) / 2;
      setCurrentPrice(midPrice);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentPrice(0);
    setIsLoading(true);
    // Subscribe to the selected symbol
    if (selectedSymbol && isConnected) {
      subscribe([selectedSymbol]);
    }
  }, [selectedSymbol, isConnected, subscribe]);

  useEffect(() => {
    // Update price when market data changes
    const data = marketData.get(selectedSymbol);
    if (data) {
      handleTradeUpdate(data);
    }
  }, [marketData, selectedSymbol, handleTradeUpdate]);

  if (isLoading && currentPrice === 0) {
    return <PriceCardSkeleton />;
  }

  return (
    <div className="border-r border-border border-dashed p-4 flex gap-3 group">
      <div className="w-32 border border-dashed border-border flex-shrink-0 bg-background group-hover:border-muted-foreground transition-colors duration-100 p-2 rounded-sm">
        {getIcons(selectedSymbol.toLowerCase())}
      </div>
      <div className="border border-dashed border-border py-2 px-3 w-full flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <p className="font-bold font-mono">{selectedSymbol}</p>
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          ></div>
        </div>
        <p className="font-semibold tracking-tight font-mono text-4xl">
          {currentPrice > 0 ? `$${currentPrice.toLocaleString('en-US')}` : '0'}
        </p>
      </div>
    </div>
  );
};

export default PriceCard;
