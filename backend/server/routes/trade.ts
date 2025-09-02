import { Router, type Request, type Response  } from "express";
import { prisma } from "../lib/prsimaClient";
import { TradeType } from "../generated/prisma";

const router = Router();

router.post("/", async (req:Request, res: Response) => {
    try {
        const { asset, type, margin, leverage } = req.body;
        
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized - User not authenticated"
            });
        }
        
        const { userId, email } = req.user;
    
        if(!asset || !type || !margin || !leverage || (type.toUpperCase() !== "BUY" && type.toUpperCase() !== "SELL")){
            return res.status(400).json({
                message: "Incorrect inputs"
            });
        }

        const userData = await prisma.user.findUnique({
            where:{ email }
        });

        if (!userData) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const userBalance = userData.balance as any;
        const tradableBalance = userBalance?.usd?.tradable || 0;
        const amount = margin * leverage;

        if(tradableBalance < margin ){
            return res.status(402).json({
                message: "Sorry trade can't be executed due to less balance"
            })
        }

        // For v1, use a mock price - you'll replace this with real price later
        const mockPrice = 50000; // Mock price for calculation
        const quantity = amount / mockPrice;
    
        const trade = await prisma.trade.create({
            data: {
                userId,
                asset,
                type: type.toUpperCase() as TradeType,
                leverage,
                margin,
                amount,
                price: mockPrice,
                quantity
            }
        });

        res.status(200).json({
            orderId: trade.id,
            message:"trade successfully executed"
        });
    } catch (e) {
        console.error("Error while saving trade data in db", e);
        res.status(500).json({
            message: "Internal server error"
        });
    }

})

export default router;