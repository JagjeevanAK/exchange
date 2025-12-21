import { Router } from "express";
import { prisma } from "../lib/prsimaClient";

const router = Router();

router.get('/balance', async (req, res) => {
    try {
        // Get user info from the auth middleware
        const userPayload = req.user;
        
        if (!userPayload || !userPayload.email) {
            return res.status(401).json({
                message: "User not authenticated"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: userPayload.email }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const balance = typeof user.balance === 'string' ? JSON.parse(user.balance) : user.balance;

        res.status(200).json({
            usd_balance: balance.usd.tradable,
            locked_balance: balance.usd.locked
        });

    } catch (e) {
        console.error("Error while getting balance", e);
        res.status(500).json({
            message: "Error while retrieving balance from db"
        });
    }
});

export default router;