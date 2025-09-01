"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TradingContextType {
    selectedSymbol: string;
    setSelectedSymbol: (symbol: string) => void;
    timeInterval: string;
    setTimeInterval: (interval: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTradingContext = () => {
    const context = useContext(TradingContext);
    if (!context) {
        throw new Error('useTradingContext must be used within a TradingProvider');
    }
    return context;
};

interface TradingProviderProps {
    children: ReactNode;
}

export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
    const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
    const [timeInterval, setTimeInterval] = useState('1m');

    return (
        <TradingContext.Provider value={{
            selectedSymbol,
            setSelectedSymbol,
            timeInterval,
            setTimeInterval
        }}>
            {children}
        </TradingContext.Provider>
    );
};
