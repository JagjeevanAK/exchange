import React from "react";
import { BTC, ETH, SOL } from "@/components/icons/icons";

export const getIcons = (symbol: string): React.ReactElement => {
    const normalizedSymbol = symbol.toLowerCase();
    
    switch (normalizedSymbol) {
        case 'btc':
        case 'btcusdt':
            return React.createElement(BTC);
        case 'eth':
        case 'ethusdt':
            return React.createElement(ETH);
        case 'sol':
        case 'solusdt':
            return React.createElement(SOL);
        default:
            return React.createElement(BTC); // Default fallback
    }
};
