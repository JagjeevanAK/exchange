"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type OrderSide = "buy" | "sell";

interface OrderDetails {
  side: OrderSide;
  amount: number;
  leverage: number;
}

export default function OrderBook() {
  const [activeTab, setActiveTab] = useState<OrderSide | null>("buy");
  const [amount, setAmount] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(1);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  const handleTabClick = (side: OrderSide) => {
    setActiveTab(side);
    setAmount("");
    setLeverage(1);
  };

  const handleConfirmOrder = () => {
    if (!activeTab || !amount) return;
    
    const details: OrderDetails = {
      side: activeTab,
      amount: parseFloat(amount),
      leverage: leverage,
    };
    
    setOrderDetails(details);
    setShowConfirmation(true);
  };

  const handlePlaceOrder = () => {
    // Here you would integrate with your order placement API
    console.log("Placing order:", orderDetails);
    setShowConfirmation(false);
    setActiveTab(null);
    setAmount("");
    setLeverage(1);
    setOrderDetails(null);
  };

  const handleCancelOrder = () => {
    setShowConfirmation(false);
    setOrderDetails(null);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {/* Buy/Sell Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => handleTabClick("buy")}
          variant={activeTab === "buy" ? "default" : "outline"}
          className={`flex-1 ${
            activeTab === "buy" ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-600 hover:bg-green-50"
          }`}
        >
          Buy
        </Button>
        <Button
          onClick={() => handleTabClick("sell")}
          variant={activeTab === "sell" ? "default" : "outline"}
          className={`flex-1 ${
            activeTab === "sell" ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-600 text-red-600 hover:bg-red-50"
          }`}
        >
          Sell
        </Button>
      </div>

      {/* Order Form */}
      {activeTab && (
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Amount
            </label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Leverage: {leverage}x
            </label>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={leverage}
                onChange={(e) => setLeverage(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1x</span>
                <span>5.5x</span>
                <span>10x</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleConfirmOrder}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full ${
              activeTab === "buy"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            Review Order
          </Button>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Confirm Order
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Side:</span>
                <span
                  className={`font-medium ${
                    orderDetails.side === "buy"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {orderDetails.side.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-foreground">
                  ${orderDetails.amount.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leverage:</span>
                <span className="font-medium text-foreground">
                  {orderDetails.leverage}x
                </span>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium text-foreground">
                    ${(orderDetails.amount * orderDetails.leverage).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCancelOrder}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePlaceOrder}
                className={`flex-1 ${
                  orderDetails.side === "buy"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } text-white`}
              >
                Place Order
              </Button>
            </div>
          </Card>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}