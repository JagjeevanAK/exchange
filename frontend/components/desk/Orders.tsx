'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { useOrders } from "./OrdersContext";

type OrderType = 'open' | 'pending' | 'closed';

interface Order {
    id: string;
    pair: string;
    type: 'Buy' | 'Sell';
    amount: string;
    price: string;
    status: OrderType;
}

const mockOrders: Order[] = [
    { id: '1', pair: 'BTC/USD', type: 'Buy', amount: '+$42,350', price: '$43,000', status: 'open' },
    { id: '2', pair: 'ETH/USD', type: 'Sell', amount: '-$2,680', price: '$2,700', status: 'open' },
    { id: '3', pair: 'SOL/USD', type: 'Buy', amount: '+$890', price: '$95', status: 'pending' },
    { id: '4', pair: 'BTC/USD', type: 'Buy', amount: '+$21,500', price: '$42,800', status: 'pending' },
    { id: '5', pair: 'ETH/USD', type: 'Sell', amount: '-$5,400', price: '$2,650', status: 'closed' },
    { id: '6', pair: 'BTC/USD', type: 'Buy', amount: '+$41,200', price: '$41,500', status: 'closed' },
];

export default function Orders() {
    const [activeTab, setActiveTab] = useState<OrderType>('open');
    const { isOrdersCollapsed, setIsOrdersCollapsed } = useOrders();

    const tabs: { key: OrderType; label: string }[] = [
        { key: 'open', label: 'Open Orders' },
        { key: 'pending', label: 'Pending' },
        { key: 'closed', label: 'Closed' },
    ];

    const filteredOrders = mockOrders.filter(order => order.status === activeTab);

    const getAmountColor = (type: 'Buy' | 'Sell') => {
        return type === 'Buy' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    };

    const toggleDrawer = () => {
        setIsOrdersCollapsed(!isOrdersCollapsed);
    };

    return (
        <div className="relative h-full overflow-hidden">
            {/* Always visible trigger bar with tabs */}
            <div className="flex items-center justify-between p-2 bg-background border-b border-border">
                <div className="flex items-center gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`px-2 py-1 text-xs font-medium transition-colors rounded ${
                                activeTab === tab.key
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab(tab.key);
                            }}
                        >
                            {tab.label}
                            <span className="ml-1 px-1 py-0.5 text-xs bg-muted rounded">
                                {mockOrders.filter(order => order.status === tab.key).length}
                            </span>
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={toggleDrawer}>
                    {isOrdersCollapsed ? (
                        <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Content panel that appears/disappears */}
            {!isOrdersCollapsed && (
                <div className="absolute inset-x-0 top-12 bottom-0 bg-background border-l border-r border-border">
                    <div className="h-full flex flex-col">
                        {/* Orders List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="space-y-2">
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map((order) => (
                                        <div key={order.id} className="flex justify-between items-center p-2 bg-card rounded shadow-sm border border-border">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-card-foreground">{order.pair}</span>
                                                <span className="text-xs text-muted-foreground">{order.price}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-medium text-muted-foreground">{order.type}</span>
                                                <span className={`text-xs font-semibold ${getAmountColor(order.type)}`}>
                                                    {order.amount}
                                                </span>
                                            </div>
                                            {activeTab !== 'closed' && (
                                                <div className="flex gap-1">
                                                    {activeTab === 'pending' && (
                                                        <button className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/30">
                                                            Execute
                                                        </button>
                                                    )}
                                                    <button className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30">
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-20 text-muted-foreground">
                                        <p className="text-xs">No {activeTab} orders</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}