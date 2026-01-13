import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prsimaClient';
import { Status } from '../prisma/generated/prisma/client';
import { getAssetBySymbol } from '../lib/assets';
import { sendNotification } from '../lib/notification-queue';

const router = Router();

/**
 * GET /trades/closed - Get all closed positions for the authenticated user
 */
router.get('/closed', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const { userId } = req.user;

    const closedPositions = await prisma.position.findMany({
      where: {
        userId,
        status: 'CLOSED' as Status,
      },
      orderBy: { closedAt: 'desc' },
    });

    const positions = closedPositions.map((position: any) => ({
      id: position.id,
      asset: position.asset,
      type: position.type,
      margin: position.margin,
      amount: position.amount,
      entryPrice: position.entryPrice,
      exitPrice: position.exitPrice,
      quantity: position.quantity,
      leverage: position.leverage,
      pnl: position.pnl,
      closedAt: position.closedAt,
      createdAt: position.createdAt,
    }));

    res.status(200).json({
      success: true,
      message: 'Closed positions retrieved successfully',
      data: {
        positions,
        count: positions.length,
      },
    });
  } catch (e) {
    console.error('Error while getting closed positions', e);
    res.status(500).json({
      message: 'Internal server error while fetching closed positions',
    });
  }
});

/**
 * POST /trades/:id/close - Close an open position
 *
 * P&L Calculation for CFD:
 * - LONG/BUY: PnL = (exitPrice - entryPrice) * quantity
 * - SHORT/SELL: PnL = (entryPrice - exitPrice) * quantity
 *
 * Exit price is determined by the opposite side:
 * - Closing LONG: Use sellPrice (bid) - user sells at lower price
 * - Closing SHORT: Use buyPrice (ask) - user buys back at higher price
 */
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const { userId, email } = req.user;
    const positionId = req.params.id;

    if (!positionId) {
      return res.status(400).json({
        message: 'Position ID is required',
      });
    }

    // Get the position
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      return res.status(404).json({
        message: 'Position not found',
      });
    }

    // Verify ownership
    if (position.userId !== userId) {
      return res.status(403).json({
        message: "You don't have permission to close this position",
      });
    }

    // Check if already closed
    if (position.status === 'CLOSED') {
      return res.status(400).json({
        message: 'Position is already closed',
      });
    }

    // Get current market price
    const assetData = await getAssetBySymbol(position.asset);

    if (!assetData) {
      return res.status(400).json({
        message: `Unable to get current price for ${position.asset}`,
      });
    }

    // Determine exit price based on position direction
    // Closing LONG: Use sellPrice (bid) - user sells back
    // Closing SHORT: Use buyPrice (ask) - user buys back
    const isLong = position.type === 'BUY' || position.type === 'LONG';

    // Prices from getAssetBySymbol are multiplied by 10000
    const exitPrice = isLong ? assetData.sellPrice / 10000 : assetData.buyPrice / 10000;

    // Calculate P&L
    // LONG: Profit when price goes UP (exitPrice > entryPrice)
    // SHORT: Profit when price goes DOWN (entryPrice > exitPrice)
    const pnl = isLong
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;

    // Get user for balance update
    const userData = await prisma.user.findUnique({
      where: { id: position.userId },
    });

    if (!userData) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const userBalance = userData.balance as any;
    const tradableBalance = userBalance?.usd?.tradable || 0;
    const lockedBalance = userBalance?.usd?.locked || 0;

    // Calculate new balance
    // Return margin to tradable + add P&L (can be negative)
    const marginReturn = position.margin;
    const newTradableBalance = tradableBalance + marginReturn + pnl;
    const newLockedBalance = Math.max(0, lockedBalance - marginReturn);

    // Use transaction to ensure atomicity
    const [updatedPosition] = await prisma.$transaction([
      // Update position to closed
      prisma.position.update({
        where: { id: positionId },
        data: {
          status: 'CLOSED' as Status,
          exitPrice,
          pnl,
          closedAt: new Date(),
        },
      }),
      // Update user balance
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

    // Send notification
    try {
      await sendNotification({
        to: email || '',
        asset: position.asset,
        amount: position.amount,
        quantity: position.quantity,
        order: position.id,
        type: 'CLOSE',
      });
    } catch (notificationError) {
      console.error('Failed to queue close notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: pnl >= 0 ? 'Position closed with profit!' : 'Position closed with loss',
      position: {
        id: updatedPosition.id,
        asset: updatedPosition.asset,
        type: updatedPosition.type,
        entryPrice: position.entryPrice,
        exitPrice: updatedPosition.exitPrice,
        quantity: position.quantity,
        pnl: updatedPosition.pnl,
        pnlPercentage: ((pnl / position.margin) * 100).toFixed(2) + '%',
        closedAt: updatedPosition.closedAt,
      },
      balance: {
        tradable: newTradableBalance,
        locked: newLockedBalance,
      },
    });
  } catch (e) {
    console.error('Error while closing position', e);
    res.status(500).json({
      message: 'Internal server error while closing position',
    });
  }
});

export default router;
