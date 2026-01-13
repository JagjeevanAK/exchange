'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useWallet } from './WalletContext';

// Position/Order type definition
export interface Position {
  id: string;
  asset: string;
  type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  orderType: 'MARKET' | 'LIMIT';
  status: 'OPEN' | 'PENDING' | 'CLOSED' | 'CANCELLED';
  margin: number;
  amount: number;
  quantity: number;
  leverage: number;
  entryPrice: number;
  exitPrice?: number;
  limitPrice?: number;
  currentPrice?: number;
  pnl?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercentage?: string;
  priceDistance?: string;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  createdAt: string;
  closedAt?: string;
}

interface OrdersContextType {
  // UI state
  isOrdersCollapsed: boolean;
  setIsOrdersCollapsed: (collapsed: boolean) => void;

  // Orders data
  openPositions: Position[];
  pendingOrders: Position[];
  closedPositions: Position[];

  // Loading and error states
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;

  // Actions
  refreshOrders: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  closePosition: (positionId: string) => Promise<boolean>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

// Polling interval in milliseconds
const POLLING_INTERVAL = 5000;

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [isOrdersCollapsed, setIsOrdersCollapsed] = useState(true);
  const { refreshBalance } = useWallet();

  // Orders data
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Fetch all orders from the backend
   */
  const refreshOrders = useCallback(async () => {
    if (!isMounted) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all order types in parallel
      const [openRes, pendingRes, closedRes] = await Promise.all([
        api.getOpenTrades().catch((e) => {
          console.error('Failed to fetch open trades:', e);
          return { data: { positions: [] } };
        }),
        api.getPendingOrders().catch((e) => {
          console.error('Failed to fetch pending orders:', e);
          return { data: { orders: [] } };
        }),
        api.getClosedTrades().catch((e) => {
          console.error('Failed to fetch closed trades:', e);
          return { data: { positions: [] } };
        }),
      ]);

      setOpenPositions(openRes?.data?.positions || []);
      setPendingOrders(pendingRes?.data?.orders || []);
      setClosedPositions(closedRes?.data?.positions || []);
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [isMounted]);

  /**
   * Cancel a pending limit order
   */
  const cancelOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      try {
        setIsActionLoading(true);

        const response = await api.cancelOrder(orderId);

        // Optimistically remove from pending orders
        setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));

        toast.success('Order cancelled', {
          description: `Margin of $${response.order?.margin?.toFixed(2) || '0'} has been refunded.`,
        });

        // Refresh orders and balance to reflect the changes
        await Promise.all([refreshOrders(), refreshBalance()]);

        return true;
      } catch (err) {
        console.error('Error cancelling order:', err);
        toast.error('Failed to cancel order', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    [refreshOrders, refreshBalance]
  );

  /**
   * Close an open position
   */
  const closePosition = useCallback(
    async (positionId: string): Promise<boolean> => {
      try {
        setIsActionLoading(true);

        const response = await api.closeTrade(positionId);

        // Optimistically remove from open positions
        setOpenPositions((prev) => prev.filter((pos) => pos.id !== positionId));

        const pnl = response.position?.pnl || 0;
        const pnlFormatted = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

        toast.success(pnl >= 0 ? 'Position closed with profit!' : 'Position closed with loss', {
          description: `P&L: ${pnlFormatted} (${response.position?.pnlPercentage || '0%'})`,
        });

        // Refresh orders and balance to reflect the changes
        await Promise.all([refreshOrders(), refreshBalance()]);

        return true;
      } catch (err) {
        console.error('Error closing position:', err);
        toast.error('Failed to close position', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    [refreshOrders, refreshBalance]
  );

  // Initialize and set up polling
  useEffect(() => {
    setIsMounted(true);

    // Initial fetch
    refreshOrders();

    // Set up polling interval
    const intervalId = setInterval(() => {
      refreshOrders();
    }, POLLING_INTERVAL);

    return () => {
      setIsMounted(false);
      clearInterval(intervalId);
    };
  }, [refreshOrders]);

  return (
    <OrdersContext.Provider
      value={{
        isOrdersCollapsed,
        setIsOrdersCollapsed,
        openPositions,
        pendingOrders,
        closedPositions,
        isLoading,
        isActionLoading,
        error,
        refreshOrders,
        cancelOrder,
        closePosition,
      }}
    >
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
