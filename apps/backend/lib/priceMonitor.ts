import { prisma } from './prsimaClient';
import { Status, OrderType } from '../prisma/generated/prisma/client';
import { sendNotification } from './notification-queue';
import { initRedisSubscriber, subscribeToMultiplePrices, getLatestPrice } from './redisSubscriber';

// Symbols to monitor - these should match the poller's subscriptions
const MONITORED_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDC',
  'BTCFDUSD',
  'ETHFDUSD',
  'ETHUSDC',
  'SOLFDUSD',
  'SOLUSDC',
];

// Debounce interval to avoid checking too frequently (in ms)
const CHECK_INTERVAL_MS = 1000;

// Track last check time per symbol
const lastCheckTime: Map<string, number> = new Map();

// Flag to track if monitor is running
let isMonitorRunning = false;

/**
 * Extract base asset from trading pair
 * e.g., BTCUSDT -> BTC, ETHFDUSD -> ETH
 */
function extractBaseAsset(symbol: string): string {
  const quoteCurrencies = ['USDT', 'USDC', 'FDUSD', 'USD'];
  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      return symbol.replace(quote, '');
    }
  }
  return symbol;
}

/**
 * Start the price monitor service
 * Subscribes to price updates and monitors pending orders and TP/SL triggers
 */
export async function startPriceMonitor(): Promise<void> {
  if (isMonitorRunning) {
    console.log('Price monitor is already running');
    return;
  }

  console.log('Starting price monitor service...');

  try {
    // Initialize Redis subscriber
    await initRedisSubscriber();

    // Subscribe to all monitored symbols
    await subscribeToMultiplePrices(MONITORED_SYMBOLS, handlePriceUpdate);

    isMonitorRunning = true;
    console.log(`Price monitor started. Monitoring ${MONITORED_SYMBOLS.length} symbols.`);
  } catch (error) {
    console.error('Failed to start price monitor:', error);
    throw error;
  }
}

/**
 * Handle price update from Redis
 * Checks pending orders and TP/SL for open positions
 */
async function handlePriceUpdate(price: number, symbol: string): Promise<void> {
  // Debounce: only check if enough time has passed
  const now = Date.now();
  const lastCheck = lastCheckTime.get(symbol) || 0;

  if (now - lastCheck < CHECK_INTERVAL_MS) {
    return;
  }

  lastCheckTime.set(symbol, now);

  // Extract base asset for matching with positions
  const baseAsset = extractBaseAsset(symbol);

  // Run checks in parallel
  await Promise.all([
    checkPendingOrders(baseAsset, price, symbol),
    checkTakeProfitStopLoss(baseAsset, price, symbol),
  ]);
}

/**
 * Check and execute pending limit orders when limit price is hit
 */
async function checkPendingOrders(
  asset: string,
  currentPrice: number,
  symbol: string
): Promise<void> {
  try {
    // Find all pending orders for this asset
    const pendingOrders = await prisma.position.findMany({
      where: {
        asset,
        status: 'PENDING' as Status,
        orderType: 'LIMIT' as OrderType,
        limitPrice: { not: null },
      },
      include: {
        user: true,
      },
    });

    if (pendingOrders.length === 0) {
      return;
    }

    for (const order of pendingOrders) {
      const isLong = order.type === 'BUY' || order.type === 'LONG';
      const limitPrice = order.limitPrice!;

      // Check if limit price is hit
      // LONG: Execute when price drops to or below limitPrice
      // SHORT: Execute when price rises to or above limitPrice
      let shouldExecute = false;

      if (isLong && currentPrice <= limitPrice) {
        shouldExecute = true;
        console.log(
          `LONG limit order triggered: ${order.id} - Current: ${currentPrice} <= Limit: ${limitPrice}`
        );
      } else if (!isLong && currentPrice >= limitPrice) {
        shouldExecute = true;
        console.log(
          `SHORT limit order triggered: ${order.id} - Current: ${currentPrice} >= Limit: ${limitPrice}`
        );
      }

      if (shouldExecute) {
        await executeLimitOrder(order, currentPrice);
      }
    }
  } catch (error) {
    console.error(`Error checking pending orders for ${asset}:`, error);
  }
}

/**
 * Execute a pending limit order at the current market price
 */
async function executeLimitOrder(order: any, currentPrice: number): Promise<void> {
  try {
    console.log(`Executing limit order ${order.id} at price ${currentPrice}`);

    // Recalculate quantity based on actual execution price
    const quantity = order.amount / currentPrice;

    // Update the order to OPEN status with actual entry price
    await prisma.position.update({
      where: { id: order.id },
      data: {
        status: 'OPEN' as Status,
        entryPrice: currentPrice,
        quantity,
      },
    });

    console.log(`Limit order ${order.id} executed successfully at ${currentPrice}`);

    // Send notification
    try {
      const userEmail = order.user?.email;
      if (userEmail) {
        await sendNotification({
          to: userEmail,
          asset: order.asset,
          amount: order.amount,
          quantity,
          order: order.id,
          type: 'LIMIT_EXECUTED',
        });
      }
    } catch (notificationError) {
      console.error('Failed to send limit execution notification:', notificationError);
    }
  } catch (error) {
    console.error(`Failed to execute limit order ${order.id}:`, error);
  }
}

/**
 * Check and auto-close open positions when TP or SL is triggered
 * SL has priority over TP to protect users from losses
 */
async function checkTakeProfitStopLoss(
  asset: string,
  currentPrice: number,
  symbol: string
): Promise<void> {
  try {
    // Find all open positions with TP or SL set for this asset
    const openPositions = await prisma.position.findMany({
      where: {
        asset,
        status: 'OPEN' as Status,
        OR: [{ takeProfitPrice: { not: null } }, { stopLossPrice: { not: null } }],
      },
      include: {
        user: true,
      },
    });

    if (openPositions.length === 0) {
      return;
    }

    for (const position of openPositions) {
      const isLong = position.type === 'BUY' || position.type === 'LONG';

      // Check Stop Loss first (priority)
      if (position.stopLossPrice) {
        let slTriggered = false;

        // LONG: SL triggers when price drops to or below SL price
        // SHORT: SL triggers when price rises to or above SL price
        if (isLong && currentPrice <= position.stopLossPrice) {
          slTriggered = true;
          console.log(
            `LONG SL triggered: ${position.id} - Current: ${currentPrice} <= SL: ${position.stopLossPrice}`
          );
        } else if (!isLong && currentPrice >= position.stopLossPrice) {
          slTriggered = true;
          console.log(
            `SHORT SL triggered: ${position.id} - Current: ${currentPrice} >= SL: ${position.stopLossPrice}`
          );
        }

        if (slTriggered) {
          await autoClosePosition(position, currentPrice, 'SL');
          continue; // Don't check TP if SL was triggered
        }
      }

      // Check Take Profit
      if (position.takeProfitPrice) {
        let tpTriggered = false;

        // LONG: TP triggers when price rises to or above TP price
        // SHORT: TP triggers when price drops to or below TP price
        if (isLong && currentPrice >= position.takeProfitPrice) {
          tpTriggered = true;
          console.log(
            `LONG TP triggered: ${position.id} - Current: ${currentPrice} >= TP: ${position.takeProfitPrice}`
          );
        } else if (!isLong && currentPrice <= position.takeProfitPrice) {
          tpTriggered = true;
          console.log(
            `SHORT TP triggered: ${position.id} - Current: ${currentPrice} <= TP: ${position.takeProfitPrice}`
          );
        }

        if (tpTriggered) {
          await autoClosePosition(position, currentPrice, 'TP');
        }
      }
    }
  } catch (error) {
    console.error(`Error checking TP/SL for ${asset}:`, error);
  }
}

/**
 * Auto-close a position when TP or SL is triggered
 */
async function autoClosePosition(
  position: any,
  currentPrice: number,
  reason: 'TP' | 'SL'
): Promise<void> {
  try {
    console.log(`Auto-closing position ${position.id} due to ${reason} at price ${currentPrice}`);

    const isLong = position.type === 'BUY' || position.type === 'LONG';

    // Calculate P&L
    // LONG: Profit when price goes UP (exitPrice > entryPrice)
    // SHORT: Profit when price goes DOWN (entryPrice > exitPrice)
    const pnl = isLong
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;

    // Get user for balance update
    const userData = await prisma.user.findUnique({
      where: { id: position.userId },
    });

    if (!userData) {
      console.error(`User not found for position ${position.id}`);
      return;
    }

    const userBalance = userData.balance as any;
    const tradableBalance = userBalance?.usd?.tradable || 0;
    const lockedBalance = userBalance?.usd?.locked || 0;

    // Calculate new balance
    // Return margin to tradable + add P&L (can be negative)
    const marginReturn = position.margin;
    const newTradableBalance = tradableBalance + marginReturn + pnl;
    const newLockedBalance = Math.max(0, lockedBalance - marginReturn);

    // Use transaction to close position and update balance
    await prisma.$transaction([
      prisma.position.update({
        where: { id: position.id },
        data: {
          status: 'CLOSED' as Status,
          exitPrice: currentPrice,
          pnl,
          closedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userData.id },
        data: {
          balance: {
            usd: {
              tradable: newTradableBalance,
              locked: newLockedBalance,
            },
          },
        },
      }),
    ]);

    console.log(`Position ${position.id} closed. PnL: ${pnl.toFixed(2)}, Reason: ${reason}`);

    // Send notification
    try {
      const userEmail = position.user?.email;
      if (userEmail) {
        await sendNotification({
          to: userEmail,
          asset: position.asset,
          amount: position.amount,
          quantity: position.quantity,
          order: position.id,
          type: reason === 'TP' ? 'TP_TRIGGERED' : 'SL_TRIGGERED',
        });
      }
    } catch (notificationError) {
      console.error(`Failed to send ${reason} notification:`, notificationError);
    }
  } catch (error) {
    console.error(`Failed to auto-close position ${position.id}:`, error);
  }
}

/**
 * Stop the price monitor service
 */
export function stopPriceMonitor(): void {
  isMonitorRunning = false;
  lastCheckTime.clear();
  console.log('Price monitor stopped');
}

/**
 * Check if the price monitor is running
 */
export function isPriceMonitorRunning(): boolean {
  return isMonitorRunning;
}

export default startPriceMonitor;
