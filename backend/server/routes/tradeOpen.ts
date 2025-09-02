import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prsimaClient";

const router = Router();

router.get("/open", async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Sorry you can't access the requested data"
            });
        }

        const { userId } = req.user;

        const userTrades = await prisma.trade.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        const openTrades = userTrades.map((trade: any) => ({
            id: trade.id,
            asset: trade.asset,
            type: trade.type,
            margin: trade.margin,
            amount: trade.amount,
            price: trade.price,
            quantity: trade.quantity,
            leverage: trade.leverage,
            status: 'OPEN'
        }));

        res.status(200).json({
            success: true,
            message: "Open trades retrieved successfully",
            data: {
                userId,
                openTrades,
                count: openTrades.length
            }
        });

    } catch (e) {
        console.error("Error while getting the open trades", e);
        res.status(500).json({
            message: "Internal server error while fetching open trades"
        });
    }
});

export default router;