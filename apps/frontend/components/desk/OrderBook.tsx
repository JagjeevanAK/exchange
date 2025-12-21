'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Minus, Plus } from 'lucide-react';
import { useNumberInput } from '@/hooks/useNumberInput';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

interface OrderDetails {
  side: OrderSide;
  orderType: OrderType;
  amount: number;
  leverage: number;
  takeProfitPrice: string;
  stopLossPrice: string;
  takeProfitGain: string;
  stopLossAmount: string;
  enableTakeProfitStopLoss: boolean;
}

function OrderBookSkeleton() {
  return (
    <div className="w-full h-full px-4 pb-2">
      <Card className="p-4 space-y-3 h-full flex flex-col">
        {/* Tabs skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex w-full max-w-md gap-0">
            <Skeleton className="flex-1 h-12 rounded-l-md" />
            <Skeleton className="flex-1 h-12 rounded-r-md" />
          </div>
        </div>

        {/* Market/Limit buttons skeleton */}
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="flex-1 h-10" />
        </div>

        {/* Amount input skeleton */}
        <Skeleton className="h-16 rounded-lg" />

        {/* Leverage section skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>

        {/* Take profit/Stop loss checkbox skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Place order button skeleton */}
        <div className="flex-1 flex items-end">
          <Skeleton className="w-full h-12" />
        </div>
      </Card>
    </div>
  );
}

export default function OrderBook() {
  const [activeTab, setActiveTab] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [leverage, setLeverage] = useState<number>(13.2);
  const [enableTakeProfitStopLoss, setEnableTakeProfitStopLoss] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use number input hooks for formatted inputs
  const amountInput = useNumberInput({ initialValue: '', decimals: 2 });
  const takeProfitPriceInput = useNumberInput({ initialValue: '', decimals: 2 });
  const takeProfitGainInput = useNumberInput({ initialValue: '', decimals: 2 });
  const stopLossPriceInput = useNumberInput({ initialValue: '', decimals: 2 });
  const stopLossAmountInput = useNumberInput({ initialValue: '', decimals: 2 });

  const handleTabClick = (side: OrderSide) => {
    setActiveTab(side);
  };

  const handleLeverageChange = (value: number) => {
    setLeverage(Math.max(1.1, Math.min(100, value)));
  };

  const handlePlaceOrder = () => {
    const orderDetails: OrderDetails = {
      side: activeTab,
      orderType,
      amount: amountInput.numericValue,
      leverage,
      takeProfitPrice: takeProfitPriceInput.rawValue,
      stopLossPrice: stopLossPriceInput.rawValue,
      takeProfitGain: takeProfitGainInput.rawValue,
      stopLossAmount: stopLossAmountInput.rawValue,
      enableTakeProfitStopLoss,
    };
    console.log('Placing order:', orderDetails);
    // Reset form
    amountInput.reset();
    takeProfitPriceInput.reset();
    stopLossPriceInput.reset();
    takeProfitGainInput.reset();
    stopLossAmountInput.reset();
  };

  if (!isMounted) {
    return <OrderBookSkeleton />;
  }

  return (
    <div className="w-full h-full px-4 pb-2">
      {/* Order Book Card */}
      <Card className="p-4 space-y-3 h-full flex flex-col">
        {/* Top Row: Long/Buy - Short/Sell tabs */}
        <div className="flex items-center justify-between">
          <div className="flex w-full max-w-md">
            {/* Long/Buy Tab */}
            <button
              onClick={() => handleTabClick('buy')}
              className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200  ${
                activeTab === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              } rounded-l-md border-r border-border/50`}
            >
              Long/Buy
            </button>

            {/* Short/Sell Tab */}
            <button
              onClick={() => handleTabClick('sell')}
              className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200 ${
                activeTab === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              } rounded-r-md`}
            >
              Short/Sell
            </button>
          </div>
        </div>

        {/* Market/Limit Toggle and Amount */}
        <div className="flex gap-2">
          <Button
            onClick={() => setOrderType('market')}
            variant={orderType === 'market' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 h-10 font-bold"
          >
            Market
          </Button>
          <Button
            onClick={() => setOrderType('limit')}
            variant={orderType === 'limit' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 h-10 font-bold"
          >
            Limit
          </Button>
        </div>

        {/* WBTC Section */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">{/* Work to do here */}</div>
          <div className="text-right">
            <input
              type="text"
              placeholder="0.00"
              value={amountInput.displayValue}
              onChange={(e) => amountInput.handleChange(e.target.value)}
              className="bg-transparent border-none outline-none text-lg font-medium text-right w-full focus:ring-0 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Leverage Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLeverageChange(leverage - 0.1)}
              className="p-1"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-bold">{leverage.toFixed(1)}x</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLeverageChange(leverage + 0.1)}
              className="p-1"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            {/* Slider */}
            <input
              type="range"
              min="1.1"
              max="100"
              step="0.1"
              value={leverage}
              onChange={(e) => setLeverage(parseFloat(e.target.value))}
              className="w-full slider-themed"
            />

            {/* Labels */}
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1.1x</span>
              <span>20x</span>
              <span>40x</span>
              <span>60x</span>
              <span>80x</span>
              <span>100x</span>
            </div>
          </div>
        </div>

        {/* Take Profit / Stop Loss */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tpsl"
              checked={enableTakeProfitStopLoss}
              onChange={(e) => setEnableTakeProfitStopLoss(e.target.checked)}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="tpsl" className="text-sm font-medium">
              Take Profit / Stop Loss
            </label>
          </div>

          {enableTakeProfitStopLoss && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground block h-4">TP Price</label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={takeProfitPriceInput.displayValue}
                    onChange={(e) => takeProfitPriceInput.handleChange(e.target.value)}
                    className="h-8 text-sm text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground block h-4">% Gain $</label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={takeProfitGainInput.displayValue}
                    onChange={(e) => takeProfitGainInput.handleChange(e.target.value)}
                    className="h-8 text-sm text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground block h-4">SL Price</label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={stopLossPriceInput.displayValue}
                    onChange={(e) => stopLossPriceInput.handleChange(e.target.value)}
                    className="h-8 text-sm text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground block h-4">% Loss $</label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={stopLossAmountInput.displayValue}
                    onChange={(e) => stopLossAmountInput.handleChange(e.target.value)}
                    className="h-8 text-sm text-right"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Place Order Button */}
        <div className="flex-1 flex items-end">
          <Button
            onClick={handlePlaceOrder}
            disabled={!amountInput.displayValue || amountInput.numericValue <= 0}
            className={`w-full h-12 text-lg font-semibold ${
              activeTab === 'buy'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            } text-white`}
          >
            {activeTab === 'buy' ? 'Long/Buy' : 'Short/Sell'}
          </Button>
        </div>
      </Card>

      <style jsx global>{`
        .slider-themed {
          accent-color: #000000; /* Black for light theme */
        }

        .dark .slider-themed {
          accent-color: #ffffff; /* White for dark theme */
        }

        /* Remove spinner buttons from ALL number inputs */
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type='number'] {
          -moz-appearance: textfield;
        }

        /* Ensure all inputs are properly aligned */
        input[type='number'] {
          text-align: right;
        }
      `}</style>
    </div>
  );
}
