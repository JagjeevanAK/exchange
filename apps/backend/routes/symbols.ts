import { Router,type Request, type Response  } from "express";
import { getAvailableSymbols } from "../lib/candles";

const router = Router();

// GET /api/v1/candles/symbols - Get available symbols
router.get("/symbols", async (req: Request, res: Response) => {
    try {
        const symbols = await getAvailableSymbols();
        
        res.status(200).json({
            symbols,
            count: symbols.length
        });

    } catch (error) {
        console.error('Error fetching symbols:', error);
        res.status(500).json({
            error: "Internal server error while fetching symbols"
        });
    }
});
