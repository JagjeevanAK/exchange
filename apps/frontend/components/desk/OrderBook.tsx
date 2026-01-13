'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { useNumberInput } from '@/hooks/useNumberInput';
import { useTradingContext } from './TradingContext';
import { useWallet } from './WalletContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

export default function OrderBook() {
  const { selectedSymbol } = useTradingContext();
  const { refreshBalance } = useWallet();
  const [activeTab, setActiveTab] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [leverage, setLeverage] = useState<number>(13.2);
  const [enableTakeProfitStopLoss, setEnableTakeProfitStopLoss] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use number input hooks for formatted inputs
  const amountInput = useNumberInput({ initialValue: '', decimals: 2 });
  const limitPriceInput = useNumberInput({ initialValue: '', decimals: 2 });
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

  // Extract base asset from trading pair (e.g., BTCUSDT -> BTC)
  const getBaseAsset = (symbol: string): string => {
    const quoteCurrencies = ['USDT', 'USDC', 'FDUSD', 'USD'];
    for (const quote of quoteCurrencies) {
      if (symbol.endsWith(quote)) {
        return symbol.replace(quote, '');
      }
    }
    return symbol;
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    const margin = amountInput.numericValue;

    if (margin <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate limit price for limit orders
    if (orderType === 'limit') {
      const limitPrice = limitPriceInput.numericValue;
      if (limitPrice <= 0) {
        toast.error('Please enter a valid limit price');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const asset = getBaseAsset(selectedSymbol);
      const tradeType = activeTab === 'buy' ? 'LONG' : 'SHORT';

      const tradeData: {
        asset: string;
        type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
        margin: number;
        leverage: number;
        orderType: 'MARKET' | 'LIMIT';
        limitPrice?: number;
        takeProfitPrice?: number;
        stopLossPrice?: number;
      } = {
        asset,
        type: tradeType,
        margin,
        leverage: Math.round(leverage * 10) / 10, // Round to 1 decimal
        orderType: orderType === 'market' ? 'MARKET' : 'LIMIT',
      };

      // Add limit price for limit orders
      if (orderType === 'limit') {
        tradeData.limitPrice = limitPriceInput.numericValue;
      }

      // Add TP/SL if enabled
      if (enableTakeProfitStopLoss) {
        if (takeProfitPriceInput.numericValue > 0) {
          tradeData.takeProfitPrice = takeProfitPriceInput.numericValue;
        }
        if (stopLossPriceInput.numericValue > 0) {
          tradeData.stopLossPrice = stopLossPriceInput.numericValue;
        }
      }

      const response = await api.placeTrade(tradeData);

      // Different toast messages for market vs limit orders
      if (orderType === 'limit' && response.position?.status === 'PENDING') {
        toast.success(`Limit order placed!`, {
          description: `${asset} ${tradeType} @ $${limitPriceInput.numericValue} - Waiting for price`,
        });
      } else {
        toast.success(`${tradeType} order executed!`, {
          description: `${asset} - Margin: $${margin} @ ${leverage}x leverage`,
        });
      }

      console.log('Trade response:', response);

      // Refresh balance to reflect the margin deduction
      await refreshBalance();

      // Reset form
      amountInput.reset();
      limitPriceInput.reset();
      takeProfitPriceInput.reset();
      stopLossPriceInput.reset();
      takeProfitGainInput.reset();
      stopLossAmountInput.reset();
    } catch (error) {
      console.error('Trade error:', error);
      toast.error('Failed to place order', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Limit Price Input - Only shown for limit orders */}
        {orderType === 'limit' && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Limit Price (USD)</span>
              <span className="text-xs text-muted-foreground">
                {activeTab === 'buy' ? 'Buy when price ≤' : 'Sell when price ≥'}
              </span>
            </div>
            <div className="text-right">
              <input
                type="text"
                placeholder="0.00"
                value={limitPriceInput.displayValue}
                onChange={(e) => limitPriceInput.handleChange(e.target.value)}
                className="bg-transparent border-none outline-none text-lg font-medium text-right w-full focus:ring-0 placeholder:text-muted-foreground"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {activeTab === 'buy'
                ? 'For LONG: Limit price should be below current market price'
                : 'For SHORT: Limit price should be above current market price'}
            </div>
          </div>
        )}

        {/* Amount Section */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Margin (USD)</span>
            <span className="text-xs text-muted-foreground">{getBaseAsset(selectedSymbol)}</span>
          </div>
          <div className="text-right">
            <input
              type="text"
              placeholder="0.00"
              value={amountInput.displayValue}
              onChange={(e) => amountInput.handleChange(e.target.value)}
              className="bg-transparent border-none outline-none text-lg font-medium text-right w-full focus:ring-0 placeholder:text-muted-foreground"
            />
          </div>
          {amountInput.numericValue > 0 && (
            <div className="text-xs text-muted-foreground text-right">
              Position size: $
              {(amountInput.numericValue * leverage).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
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
            disabled={
              !amountInput.displayValue ||
              amountInput.numericValue <= 0 ||
              isSubmitting ||
              (orderType === 'limit' && limitPriceInput.numericValue <= 0)
            }
            className={`w-full h-12 text-lg font-semibold ${
              activeTab === 'buy'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            } text-white`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : orderType === 'limit' ? (
              activeTab === 'buy' ? (
                'Limit Long'
              ) : (
                'Limit Short'
              )
            ) : activeTab === 'buy' ? (
              'Long/Buy'
            ) : (
              'Short/Sell'
            )}
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
