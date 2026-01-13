import { Router, type Request, type Response } from 'express';
import { prisma, TradeType, Status, OrderType } from '@exchange/db';
import { sendNotification } from '../lib/notification-queue';
import { getAssetBySymbol } from '../lib/assets';

const router = Router();

/**
 * Open a new CFD position (Long/Buy or Short/Sell)
 *
 * For CFD trading:
 * - LONG/BUY: User expects price to go UP. Uses buyPrice (ask) to open.
 * - SHORT/SELL: User expects price to go DOWN. Uses sellPrice (bid) to open.
 *
 * Order Types:
 * - MARKET: Execute immediately at current market price
 * - LIMIT: Wait for price to reach limitPrice before executing
 *   - LONG limit: Execute when price drops to limitPrice (buy lower)
 *   - SHORT limit: Execute when price rises to limitPrice (sell higher)
 *
 * Amount calculation: notionalValue = margin * leverage
 * Quantity calculation: quantity = notionalValue / entryPrice
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      asset,
      type,
      margin,
      leverage,
      orderType = 'MARKET', // Default to MARKET order
      limitPrice,
      takeProfitPrice,
      stopLossPrice,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const userId = req.user.userId;
    const email = req.user.email;

    if (!userId || !email) {
      return res.status(401).json({
        message: 'Unauthorized - Invalid user token',
      });
    }

    // Validate required inputs
    if (!asset || !type || !margin || !leverage) {
      return res.status(400).json({
        message: 'Missing required fields: asset, type, margin, leverage',
      });
    }

    // Normalize trade type - support both BUY/SELL and LONG/SHORT
    const normalizedType = type.toUpperCase();
    const validTypes = ['BUY', 'SELL', 'LONG', 'SHORT'];

    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({
        message: 'Invalid trade type. Must be BUY, SELL, LONG, or SHORT',
      });
    }

    // Normalize and validate order type
    const normalizedOrderType = (orderType || 'MARKET').toUpperCase();
    if (!['MARKET', 'LIMIT'].includes(normalizedOrderType)) {
      return res.status(400).json({
        message: 'Invalid order type. Must be MARKET or LIMIT',
      });
    }

    // Validate limit price for limit orders
    if (normalizedOrderType === 'LIMIT') {
      if (!limitPrice || limitPrice <= 0) {
        return res.status(400).json({
          message: 'Limit price is required and must be positive for limit orders',
        });
      }
    }

    // Validate margin and leverage are positive numbers
    if (margin <= 0 || leverage <= 0) {
      return res.status(400).json({
        message: 'Margin and leverage must be positive numbers',
      });
    }

    // Validate leverage range (1.1x to 100x)
    if (leverage < 1.1 || leverage > 100) {
      return res.status(400).json({
        message: 'Leverage must be between 1.1 and 100',
      });
    }

    // Get user data
    const userData = await prisma.user.findUnique({
      where: { email },
    });

    if (!userData) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const userBalance = userData.balance as any;
    const tradableBalance = userBalance?.usd?.tradable || 0;
    const lockedBalance = userBalance?.usd?.locked || 0;

    // Check if user has enough margin
    if (tradableBalance < margin) {
      return res.status(402).json({
        message:
          'Insufficient balance. Required margin: ' + margin + ', Available: ' + tradableBalance,
      });
    }

    // Get real market price for the asset
    const assetData = await getAssetBySymbol(asset);

    if (!assetData) {
      return res.status(400).json({
        message: `Asset ${asset} not found or price unavailable`,
      });
    }

    // Determine if this is a long or short position
    const isLong = normalizedType === 'BUY' || normalizedType === 'LONG';

    // Prices from getAssetBySymbol are multiplied by 10000, so divide to get actual price
    const currentBuyPrice = assetData.buyPrice / 10000;
    const currentSellPrice = assetData.sellPrice / 10000;
    const currentPrice = isLong ? currentBuyPrice : currentSellPrice;

    // For limit orders, validate the limit price makes sense
    if (normalizedOrderType === 'LIMIT') {
      // LONG limit order: User wants to buy at a lower price (limit < current)
      // SHORT limit order: User wants to sell at a higher price (limit > current)
      if (isLong && limitPrice >= currentPrice) {
        // If limit price is already at or above current price, execute as market order
        console.log(
          `Limit price ${limitPrice} >= current price ${currentPrice}, executing as market order`
        );
        // Fall through to execute as market order
      } else if (!isLong && limitPrice <= currentPrice) {
        // If limit price is already at or below current price, execute as market order
        console.log(
          `Limit price ${limitPrice} <= current price ${currentPrice}, executing as market order`
        );
        // Fall through to execute as market order
      } else {
        // Create a pending limit order
        return await createPendingLimitOrder({
          res,
          userId,
          email,
          asset,
          normalizedType,
          margin,
          leverage,
          limitPrice,
          takeProfitPrice,
          stopLossPrice,
          userData,
          tradableBalance,
          lockedBalance,
        });
      }
    }

    // Execute as market order
    const entryPrice = currentPrice;

    // Calculate position size
    const amount = margin * leverage; // Notional value
    const quantity = amount / entryPrice;

    // Validate TP/SL if provided
    if (takeProfitPrice !== undefined && takeProfitPrice !== null) {
      if (isLong && takeProfitPrice <= entryPrice) {
        return res.status(400).json({
          message: 'Take profit price must be above entry price for long positions',
        });
      }
      if (!isLong && takeProfitPrice >= entryPrice) {
        return res.status(400).json({
          message: 'Take profit price must be below entry price for short positions',
        });
      }
    }

    if (stopLossPrice !== undefined && stopLossPrice !== null) {
      if (isLong && stopLossPrice >= entryPrice) {
        return res.status(400).json({
          message: 'Stop loss price must be below entry price for long positions',
        });
      }
      if (!isLong && stopLossPrice <= entryPrice) {
        return res.status(400).json({
          message: 'Stop loss price must be above entry price for short positions',
        });
      }
    }

    // Use transaction to ensure atomicity - create position AND update balance
    const [position] = await prisma.$transaction([
      // Create the position
      prisma.position.create({
        data: {
          userId,
          asset,
          type: normalizedType as TradeType,
          status: 'OPEN' as Status,
          orderType: 'MARKET' as OrderType,
          leverage,
          margin,
          amount,
          quantity,
          entryPrice,
          limitPrice: null,
          takeProfitPrice: takeProfitPrice || null,
          stopLossPrice: stopLossPrice || null,
        },
      }),
      // Update user balance - move margin from tradable to locked
      prisma.user.update({
        where: { id: userData.id },
        data: {
          balance: {
            usd: {
              tradable: tradableBalance - margin,
              locked: lockedBalance + margin,
            },
          },
        },
      }),
    ]);

    // Send notification asynchronously
    try {
      await sendNotification({
        to: email,
        asset,
        amount,
        quantity,
        order: position.id,
        type: 'OPEN',
      });
    } catch (notificationError) {
      // Log error but don't fail the trade
      console.error('Failed to queue notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      orderId: position.id,
      message: 'Position opened successfully',
      position: {
        id: position.id,
        asset: position.asset,
        type: position.type,
        orderType: position.orderType,
        status: position.status,
        margin: position.margin,
        leverage: position.leverage,
        amount: position.amount,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        takeProfitPrice: position.takeProfitPrice,
        stopLossPrice: position.stopLossPrice,
      },
    });
  } catch (e) {
    console.error('Error while saving position data in db', e);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

/**
 * Create a pending limit order
 * The order will be executed when the price reaches the limit price
 * Margin is locked immediately
 */
async function createPendingLimitOrder({
  res,
  userId,
  email,
  asset,
  normalizedType,
  margin,
  leverage,
  limitPrice,
  takeProfitPrice,
  stopLossPrice,
  userData,
  tradableBalance,
  lockedBalance,
}: {
  res: Response;
  userId: string;
  email: string;
  asset: string;
  normalizedType: string;
  margin: number;
  leverage: number;
  limitPrice: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  userData: any;
  tradableBalance: number;
  lockedBalance: number;
}) {
  // Calculate notional value based on limit price
  const amount = margin * leverage;
  const quantity = amount / limitPrice;

  // Use transaction to create pending order and lock margin
  const [position] = await prisma.$transaction([
    // Create the pending position
    prisma.position.create({
      data: {
        userId,
        asset,
        type: normalizedType as TradeType,
        status: 'PENDING' as Status,
        orderType: 'LIMIT' as OrderType,
        leverage,
        margin,
        amount,
        quantity,
        entryPrice: 0, // Will be set when order executes
        limitPrice,
        takeProfitPrice: takeProfitPrice || null,
        stopLossPrice: stopLossPrice || null,
      },
    }),
    // Lock margin immediately
    prisma.user.update({
      where: { id: userData.id },
      data: {
        balance: {
          usd: {
            tradable: tradableBalance - margin,
            locked: lockedBalance + margin,
          },
        },
      },
    }),
  ]);

  // Send notification for pending order
  try {
    await sendNotification({
      to: email,
      asset,
      amount,
      quantity,
      order: position.id,
      type: 'PENDING',
    });
  } catch (notificationError) {
    console.error('Failed to queue pending order notification:', notificationError);
  }

  return res.status(200).json({
    success: true,
    orderId: position.id,
    message: 'Limit order placed successfully. Order will execute when price reaches limit.',
    position: {
      id: position.id,
      asset: position.asset,
      type: position.type,
      orderType: position.orderType,
      status: position.status,
      margin: position.margin,
      leverage: position.leverage,
      amount: position.amount,
      quantity: position.quantity,
      limitPrice: position.limitPrice,
      takeProfitPrice: position.takeProfitPrice,
      stopLossPrice: position.stopLossPrice,
    },
  });
}

export default router;
