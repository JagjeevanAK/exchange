import { Router, type Request, type Response } from "express";
import { getAssets, getAssetBySymbol } from "../lib/assets";

const router = Router();

// GET /api/v1/assets - Get all available assets with their current prices
router.get('/', async (req: Request, res: Response) => {
    try {
        const assets = await getAssets();
        
        res.status(200).json({
            assets
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({
            error: "Internal server error while fetching assets"
        });
    }
});

// GET /api/v1/assets/:symbol - Get specific asset by symbol
router.get('/:symbol', async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;

        if (!symbol) {
            return res.status(400).json({
                error: "Symbol parameter is required"
            });
        }

        const asset = await getAssetBySymbol(symbol);

        if (!asset) {
            return res.status(404).json({
                error: `Asset ${symbol.toUpperCase()} not found`
            });
        }

        res.status(200).json({
            asset
        });

    } catch (error) {
        console.error(`Error fetching asset ${req.params.symbol}:`, error);
        res.status(500).json({
            error: "Internal server error while fetching asset"
        });
    }
});

export default router;