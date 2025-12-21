import { useWebSocket } from '@/hooks/useWebSocket';
import { useState, useCallback, useEffect } from 'react';
import { getIcons } from '@/lib/utility';
import { useTradingContext } from './TradingContext';

const PriceCard = () => {
  const { selectedSymbol } = useTradingContext();
  const [currentPrice, setCurrentPrice] = useState(0);
  const { marketData, isConnected, subscribe } = useWebSocket();
  const handleTradeUpdate = useCallback((marketData: any) => {
    if (marketData.bid && marketData.ask) {
      // Use mid price as current price
      const midPrice = (marketData.bid + marketData.ask) / 2;
      setCurrentPrice(midPrice);
    }
  }, []);

  useEffect(() => {
    setCurrentPrice(0);
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

  return (
    <div className="border-r border-[#202020] border-dashed p-4 flex gap-3 group">
      <div className="w-32 border border-dashed border-[#202020] flex-shrink-0 bg-[#101010] group-hover:border-[#808080] transition-colors duration-100 p-2 rounded-sm">
        {getIcons(selectedSymbol.toLowerCase())}
      </div>
      <div className="border border-dashed border-[#202020] py-2 px-3 w-full flex flex-col justify-center">
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
