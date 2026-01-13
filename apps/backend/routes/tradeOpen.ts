import { Router, type Request, type Response } from 'express';
import { prisma, Status } from '@exchange/db';
import { getAssetBySymbol } from '../lib/assets';

const router = Router();

/**
 * GET /trades/open - Get all open positions for the authenticated user
 * Includes unrealized P&L calculation based on current market prices
 */
router.get('/open', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const { userId } = req.user;

    const userPositions = await prisma.position.findMany({
      where: {
        userId,
        status: 'OPEN' as Status,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate unrealized P&L for each open position
    const openPositions = await Promise.all(
      userPositions.map(async (position: any) => {
        let unrealizedPnl = 0;
        let currentPrice = position.entryPrice;

        try {
          const assetData = await getAssetBySymbol(position.asset);
          if (assetData) {
            const isLong = position.type === 'BUY' || position.type === 'LONG';
            // For unrealized P&L, use the exit price (opposite side)
            currentPrice = isLong ? assetData.sellPrice / 10000 : assetData.buyPrice / 10000;

            unrealizedPnl = isLong
              ? (currentPrice - position.entryPrice) * position.quantity
              : (position.entryPrice - currentPrice) * position.quantity;
          }
        } catch (error) {
          console.error(`Error getting price for ${position.asset}:`, error);
        }

        return {
          id: position.id,
          asset: position.asset,
          type: position.type,
          margin: position.margin,
          amount: position.amount,
          entryPrice: position.entryPrice,
          currentPrice,
          quantity: position.quantity,
          leverage: position.leverage,
          takeProfitPrice: position.takeProfitPrice,
          stopLossPrice: position.stopLossPrice,
          unrealizedPnl,
          unrealizedPnlPercentage:
            position.margin > 0 ? ((unrealizedPnl / position.margin) * 100).toFixed(2) + '%' : '0%',
          createdAt: position.createdAt,
        };
      })
    );

    // Calculate totals
    const totalUnrealizedPnl = openPositions.reduce(
      (sum: number, pos: { unrealizedPnl: number }) => sum + pos.unrealizedPnl,
      0
    );
    const totalMargin = openPositions.reduce(
      (sum: number, pos: { margin: number }) => sum + pos.margin,
      0
    );

    res.status(200).json({
      success: true,
      message: 'Open positions retrieved successfully',
      data: {
        positions: openPositions,
        count: openPositions.length,
        totalUnrealizedPnl,
        totalMargin,
      },
    });
  } catch (e) {
    console.error('Error while getting the open positions', e);
    res.status(500).json({
      message: 'Internal server error while fetching open positions',
    });
  }
});

export default router;
