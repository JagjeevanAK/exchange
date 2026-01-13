'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronUpIcon, ChevronDownIcon, Loader2, X } from 'lucide-react';
import { useOrders, type Position } from './OrdersContext';

type OrderTab = 'open' | 'pending' | 'closed';

function OrdersSkeleton() {
  return (
    <div className="relative h-full overflow-hidden mt-2 border border-dashed border-border rounded">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-2 bg-background border-b border-dashed border-border mx-2 rounded-t">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>
      {/* Content skeleton */}
      <div className="p-2 mx-2 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-2 bg-card rounded shadow-sm border border-dashed border-border"
          >
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-6 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPrice(price: number | undefined): string {
  if (!price) return '$0.00';
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPnL(pnl: number | undefined): string {
  if (pnl === undefined || pnl === null) return '$0.00';
  const sign = pnl >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface OrderCardProps {
  order: Position;
  type: OrderTab;
  onClose?: () => void;
  onCancel?: () => void;
  isActionLoading?: boolean;
}

function OrderCard({ order, type, onClose, onCancel, isActionLoading }: OrderCardProps) {
  const isLong = order.type === 'BUY' || order.type === 'LONG';
  const typeLabel = isLong ? 'LONG' : 'SHORT';
  const typeColor = isLong ? 'text-green-500' : 'text-red-500';

  // Format P&L with color
  const pnlValue = type === 'open' ? order.unrealizedPnl : order.pnl;
  const pnlColor = (pnlValue ?? 0) >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-3 bg-card rounded-lg shadow-sm border border-border hover:border-border/80 transition-colors">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{order.asset}/USD</span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${isLong ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}
          >
            {typeLabel}
          </span>
          <span className="text-xs text-muted-foreground">{order.leverage}x</span>
          {order.orderType === 'LIMIT' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
              LIMIT
            </span>
          )}
        </div>

        {/* Action buttons */}
        {type === 'open' && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isActionLoading}
            className="h-7 px-2 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
          >
            {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Close'}
          </Button>
        )}
        {type === 'pending' && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isActionLoading}
            className="h-7 px-2 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
          >
            {isActionLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Price Info */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        {type === 'open' && (
          <>
            <div>
              <span className="text-muted-foreground">Entry: </span>
              <span className="font-medium">{formatPrice(order.entryPrice)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Current: </span>
              <span className="font-medium">{formatPrice(order.currentPrice)}</span>
            </div>
          </>
        )}
        {type === 'pending' && (
          <>
            <div>
              <span className="text-muted-foreground">Limit: </span>
              <span className="font-medium">{formatPrice(order.limitPrice)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Current: </span>
              <span className="font-medium">{formatPrice(order.currentPrice)}</span>
            </div>
          </>
        )}
        {type === 'closed' && (
          <>
            <div>
              <span className="text-muted-foreground">Entry: </span>
              <span className="font-medium">{formatPrice(order.entryPrice)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Exit: </span>
              <span className="font-medium">{formatPrice(order.exitPrice)}</span>
            </div>
          </>
        )}
      </div>

      {/* Margin and P&L */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Margin: </span>
          <span className="font-medium">{formatPrice(order.margin)}</span>
        </div>
        {type !== 'pending' && (
          <div>
            <span className="text-muted-foreground">P&L: </span>
            <span className={`font-medium ${pnlColor}`}>
              {formatPnL(pnlValue)}
              {order.unrealizedPnlPercentage && type === 'open' && (
                <span className="ml-1">({order.unrealizedPnlPercentage})</span>
              )}
            </span>
          </div>
        )}
        {type === 'pending' && order.priceDistance && (
          <div>
            <span className="text-muted-foreground">Distance: </span>
            <span className="font-medium">{order.priceDistance}</span>
          </div>
        )}
      </div>

      {/* TP/SL info */}
      {(order.takeProfitPrice || order.stopLossPrice) && (
        <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-border/50">
          {order.takeProfitPrice && (
            <div>
              <span className="text-muted-foreground">TP: </span>
              <span className="font-medium text-green-500">
                {formatPrice(order.takeProfitPrice)}
              </span>
            </div>
          )}
          {order.stopLossPrice && (
            <div>
              <span className="text-muted-foreground">SL: </span>
              <span className="font-medium text-red-500">{formatPrice(order.stopLossPrice)}</span>
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground mt-2 text-right">
        {type === 'closed' ? `Closed ${formatDate(order.closedAt)}` : formatDate(order.createdAt)}
      </div>
    </div>
  );
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState<OrderTab>('open');
  const [isMounted, setIsMounted] = useState(false);
  const {
    isOrdersCollapsed,
    setIsOrdersCollapsed,
    openPositions,
    pendingOrders,
    closedPositions,
    isLoading,
    isActionLoading,
    cancelOrder,
    closePosition,
  } = useOrders();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const tabs: { key: OrderTab; label: string; count: number }[] = [
    { key: 'open', label: 'Open', count: openPositions.length },
    { key: 'pending', label: 'Pending', count: pendingOrders.length },
    { key: 'closed', label: 'Closed', count: closedPositions.length },
  ];

  const getCurrentOrders = (): Position[] => {
    switch (activeTab) {
      case 'open':
        return openPositions;
      case 'pending':
        return pendingOrders;
      case 'closed':
        return closedPositions;
      default:
        return [];
    }
  };

  const handleClose = async (positionId: string) => {
    await closePosition(positionId);
  };

  const handleCancel = async (orderId: string) => {
    await cancelOrder(orderId);
  };

  const toggleDrawer = () => {
    setIsOrdersCollapsed(!isOrdersCollapsed);
  };

  if (!isMounted) {
    return <OrdersSkeleton />;
  }

  const currentOrders = getCurrentOrders();

  return (
    <div className="relative h-full overflow-hidden mt-2 border border-dashed border-border rounded">
      {/* Always visible trigger bar with tabs */}
      <div className="flex items-center justify-between p-2 bg-background border-b border-dashed border-border mx-2 rounded-t">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-2 py-1 text-sm font-medium transition-all duration-200 relative rounded ${
                activeTab === tab.key
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab.key);
                if (isOrdersCollapsed) {
                  setIsOrdersCollapsed(false);
                }
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button variant="ghost" size="sm" onClick={toggleDrawer} className="h-8 w-8 p-0">
            {isOrdersCollapsed ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content panel that appears/disappears */}
      {!isOrdersCollapsed && (
        <div className="absolute inset-x-2 top-12 bottom-2 bg-background border border-dashed border-border rounded-b overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-2">
              {currentOrders.length > 0 ? (
                <div className="space-y-2">
                  {currentOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      type={activeTab}
                      onClose={activeTab === 'open' ? () => handleClose(order.id) : undefined}
                      onCancel={activeTab === 'pending' ? () => handleCancel(order.id) : undefined}
                      isActionLoading={isActionLoading}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">
                    {activeTab === 'open' && 'No open positions'}
                    {activeTab === 'pending' && 'No pending orders'}
                    {activeTab === 'closed' && 'No closed positions'}
                  </p>
                  <p className="text-xs mt-1">
                    {activeTab === 'open' && 'Place a trade to see it here'}
                    {activeTab === 'pending' && 'Place a limit order to see it here'}
                    {activeTab === 'closed' && 'Close a position to see it here'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
