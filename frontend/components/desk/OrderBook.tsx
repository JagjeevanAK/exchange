"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RefreshCw, Minus, Plus } from "lucide-react";

type OrderSide = "buy" | "sell";
type OrderType = "market" | "limit";

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

export default function OrderBook() {
  const [activeTab, setActiveTab] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(13.2);
  const [enableTakeProfitStopLoss, setEnableTakeProfitStopLoss] = useState<boolean>(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [takeProfitGain, setTakeProfitGain] = useState<string>("");
  const [stopLossAmount, setStopLossAmount] = useState<string>("");

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
      amount: parseFloat(amount) || 0,
      leverage,
      takeProfitPrice,
      stopLossPrice,
      takeProfitGain,
      stopLossAmount,
      enableTakeProfitStopLoss,
    };
    console.log("Placing order:", orderDetails);
    // Reset form
    setAmount("");
    setTakeProfitPrice("");
    setStopLossPrice("");
    setTakeProfitGain("");
    setStopLossAmount("");
  };

  return (
    <div className="w-full h-full px-4 pb-2">
      {/* Order Book Card */}
      <Card className="p-4 space-y-3 h-full flex flex-col">
        {/* Top Row: Long/Buy - Short/Sell tabs and Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              onClick={() => handleTabClick("buy")}
              variant={activeTab === "buy" ? "default" : "ghost"}
              size="sm"
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === "buy" 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              }`}
            >
              Long/Buy
            </Button>
            <Button
              onClick={() => handleTabClick("sell")}
              variant={activeTab === "sell" ? "default" : "ghost"}
              size="sm"
              className={`px-3 py-1 text-sm font-medium ${
                activeTab === "sell" 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              Short/Sell
            </Button>
          </div>
        </div>

        {/* Market/Limit Toggle and Amount */}
        <div className="flex gap-2">
          <Button
            onClick={() => setOrderType("market")}
            variant={orderType === "market" ? "default" : "outline"}
            size="sm"
            className={`flex-1 ${
              orderType === "market" 
                ? "bg-cyan-600 hover:bg-cyan-700 text-white" 
                : "border-cyan-600 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
            }`}
          >
            Market
          </Button>
          <Button
            onClick={() => setOrderType("limit")}
            variant={orderType === "limit" ? "default" : "outline"}
            size="sm"
            className="flex-1"
          >
            Limit
          </Button>
        </div>

        {/* WBTC Section */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            {/* Work to do here */}
          </div>
          <div className="text-right">
            <span className="text-lg font-medium">0.00</span>
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
            <input
              type="range"
              min="1.1"
              max="100"
              step="0.1"
              value={leverage}
              onChange={(e) => setLeverage(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
            />
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
                <div>
                  <label className="text-xs text-muted-foreground">TP Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={takeProfitPrice}
                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>%</span> Gain
                    <span className="text-xs">$</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={takeProfitGain}
                    onChange={(e) => setTakeProfitGain(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">SL Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>%</span> Loss
                    <span className="text-xs">$</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={stopLossAmount}
                    onChange={(e) => setStopLossAmount(e.target.value)}
                    className="h-8 text-sm"
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
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full h-12 text-lg font-semibold ${
              activeTab === "buy"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            {activeTab === "buy" ? "Long/Buy" : "Short/Sell"}
          </Button>
        </div>
      </Card>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}