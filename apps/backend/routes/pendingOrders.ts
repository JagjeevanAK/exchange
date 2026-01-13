import { Router, type Request, type Response } from 'express';
import { prisma, Status } from '@exchange/db';
import { sendNotification } from '../lib/notification-queue';
import { getAssetBySymbol } from '../lib/assets';

const router = Router();

/**
 * GET /orders/pending - Get all pending limit orders for the authenticated user
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const { userId } = req.user;

    const pendingOrders = await prisma.position.findMany({
      where: {
        userId,
        status: 'PENDING' as Status,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add current price info to each pending order
    const ordersWithPrices = await Promise.all(
      pendingOrders.map(async (order) => {
        let currentPrice = 0;
        let priceDistance = 0;

        try {
          const assetData = await getAssetBySymbol(order.asset);
          if (assetData) {
            const isLong = order.type === 'BUY' || order.type === 'LONG';
            currentPrice = isLong ? assetData.buyPrice / 10000 : assetData.sellPrice / 10000;

            if (order.limitPrice) {
              // Calculate how far current price is from limit price
              priceDistance = ((currentPrice - order.limitPrice) / order.limitPrice) * 100;
            }
          }
        } catch (error) {
          console.error(`Error getting price for ${order.asset}:`, error);
        }

        return {
          id: order.id,
          asset: order.asset,
          type: order.type,
          orderType: order.orderType,
          status: order.status,
          margin: order.margin,
          amount: order.amount,
          quantity: order.quantity,
          leverage: order.leverage,
          limitPrice: order.limitPrice,
          currentPrice,
          priceDistance: priceDistance.toFixed(2) + '%',
          takeProfitPrice: order.takeProfitPrice,
          stopLossPrice: order.stopLossPrice,
          createdAt: order.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Pending orders retrieved successfully',
      data: {
        orders: ordersWithPrices,
        count: ordersWithPrices.length,
      },
    });
  } catch (e) {
    console.error('Error while getting pending orders', e);
    res.status(500).json({
      message: 'Internal server error while fetching pending orders',
    });
  }
});

/**
 * DELETE /orders/:id - Cancel a pending limit order
 * Refunds locked margin to user's tradable balance
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const { userId, email } = req.user;
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({
        message: 'Order ID is required',
      });
    }

    // Get the order
    const order = await prisma.position.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    // Verify ownership
    if (order.userId !== userId) {
      return res.status(403).json({
        message: "You don't have permission to cancel this order",
      });
    }

    // Check if order is pending
    if (order.status !== 'PENDING') {
      return res.status(400).json({
        message: `Cannot cancel order with status: ${order.status}. Only PENDING orders can be cancelled.`,
      });
    }

    // Get user for balance update
    const userData = await prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (!userData) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const userBalance = userData.balance as any;
    const tradableBalance = userBalance?.usd?.tradable || 0;
    const lockedBalance = userBalance?.usd?.locked || 0;

    // Refund margin: move from locked back to tradable
    const newTradableBalance = tradableBalance + order.margin;
    const newLockedBalance = Math.max(0, lockedBalance - order.margin);

    // Use transaction to cancel order and refund margin
    const [updatedOrder] = await prisma.$transaction([
      // Update order status to CANCELLED
      prisma.position.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED' as Status,
          closedAt: new Date(),
        },
      }),
      // Refund margin to user
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

    // Send cancellation notification
    try {
      await sendNotification({
        to: email || '',
        asset: order.asset,
        amount: order.amount,
        quantity: order.quantity,
        order: order.id,
        type: 'CANCELLED',
      });
    } catch (notificationError) {
      console.error('Failed to queue cancellation notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Margin has been refunded.',
      order: {
        id: updatedOrder.id,
        asset: updatedOrder.asset,
        type: updatedOrder.type,
        status: updatedOrder.status,
        margin: order.margin,
        refunded: order.margin,
      },
      balance: {
        tradable: newTradableBalance,
        locked: newLockedBalance,
      },
    });
  } catch (e) {
    console.error('Error while cancelling order', e);
    res.status(500).json({
      message: 'Internal server error while cancelling order',
    });
  }
});

/**
 * PUT /orders/:id - Modify a pending limit order
 * Can update limitPrice, takeProfitPrice, stopLossPrice
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthorized - User not authenticated',
      });
    }

    const { userId } = req.user;
    const orderId = req.params.id;
    const { limitPrice, takeProfitPrice, stopLossPrice } = req.body;

    if (!orderId) {
      return res.status(400).json({
        message: 'Order ID is required',
      });
    }

    // Get the order
    const order = await prisma.position.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      });
    }

    // Verify ownership
    if (order.userId !== userId) {
      return res.status(403).json({
        message: "You don't have permission to modify this order",
      });
    }

    // Check if order is pending
    if (order.status !== 'PENDING') {
      return res.status(400).json({
        message: `Cannot modify order with status: ${order.status}. Only PENDING orders can be modified.`,
      });
    }

    // Validate limit price if provided
    if (limitPrice !== undefined && limitPrice !== null) {
      if (limitPrice <= 0) {
        return res.status(400).json({
          message: 'Limit price must be a positive number',
        });
      }

      // Check if the new limit price would trigger immediate execution
      const assetData = await getAssetBySymbol(order.asset);
      if (assetData) {
        const isLong = order.type === 'BUY' || order.type === 'LONG';
        const currentPrice = isLong ? assetData.buyPrice / 10000 : assetData.sellPrice / 10000;

        if (isLong && limitPrice >= currentPrice) {
          return res.status(400).json({
            message: `Limit price ${limitPrice} is at or above current price ${currentPrice}. This would trigger immediate execution. Use market order instead.`,
          });
        }
        if (!isLong && limitPrice <= currentPrice) {
          return res.status(400).json({
            message: `Limit price ${limitPrice} is at or below current price ${currentPrice}. This would trigger immediate execution. Use market order instead.`,
          });
        }
      }
    }

    // Build update data
    const updateData: any = {};

    if (limitPrice !== undefined && limitPrice !== null) {
      updateData.limitPrice = limitPrice;
      // Recalculate quantity based on new limit price
      updateData.quantity = order.amount / limitPrice;
    }

    if (takeProfitPrice !== undefined) {
      updateData.takeProfitPrice = takeProfitPrice || null;
    }

    if (stopLossPrice !== undefined) {
      updateData.stopLossPrice = stopLossPrice || null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message:
          'No valid fields to update. Provide limitPrice, takeProfitPrice, or stopLossPrice.',
      });
    }

    // Update the order
    const updatedOrder = await prisma.position.update({
      where: { id: orderId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order: {
        id: updatedOrder.id,
        asset: updatedOrder.asset,
        type: updatedOrder.type,
        orderType: updatedOrder.orderType,
        status: updatedOrder.status,
        margin: updatedOrder.margin,
        amount: updatedOrder.amount,
        quantity: updatedOrder.quantity,
        leverage: updatedOrder.leverage,
        limitPrice: updatedOrder.limitPrice,
        takeProfitPrice: updatedOrder.takeProfitPrice,
        stopLossPrice: updatedOrder.stopLossPrice,
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt,
      },
    });
  } catch (e) {
    console.error('Error while modifying order', e);
    res.status(500).json({
      message: 'Internal server error while modifying order',
    });
  }
});

export default router;
