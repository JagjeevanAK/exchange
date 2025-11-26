'use client';
import React, { createContext, useContext, useState } from 'react';

interface OrdersContextType {
    isOrdersCollapsed: boolean;
    setIsOrdersCollapsed: (collapsed: boolean) => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
    const [isOrdersCollapsed, setIsOrdersCollapsed] = useState(true);

    return (
        <OrdersContext.Provider value={{ isOrdersCollapsed, setIsOrdersCollapsed }}>
            {children}
        </OrdersContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrdersContext);
    if (context === undefined) {
        throw new Error('useOrders must be used within an OrdersProvider');
    }
    return context;
}
