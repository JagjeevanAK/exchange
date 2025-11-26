import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

interface AssetData {
    name: string;
    symbol: string;
    buyPrice: number;
    sellPrice: number;
    decimals: number;
    imageUrl: string;
}

const assetMetadata: { [key: string]: { name: string; imageUrl: string } } = {
    'BTC': {
        name: 'Bitcoin',
        imageUrl: '../assets/btc-logo.png'
    },
    'ETH': {
        name: 'Ethereum',
        imageUrl: '../assets/eth-logo.png'
    },
    'SOL': {
        name: 'Solana',
        imageUrl: '../assets/sol-logo.png'
    },
    'XRP': {
        name: 'Ripple',
        imageUrl: '../assets/xrp-logo.png'
    },
    'USDT': {
        name: 'Tether',
        imageUrl: '../assets/tether-usdt-logo.png'
    },
    'USDC': {
        name: 'USD Coin',
        imageUrl: '../assets/usdc-logo.png'
    },
    // 'FDUSD': {
    //     name: 'First Digital USD',
    //     imageUrl: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20230912/6e82001c-c2b8-4c89-b5e4-78d3a2d4b4d2.png'
    // }
};

// Extract unique base assets from trading pairs
const extractBaseAssets = (symbols: string[]): string[] => {
    const assets = new Set<string>();
    
    symbols.forEach(symbol => {
        // Remove common quote currencies to get base asset
        const upperSymbol = symbol.toUpperCase();
        
        if (upperSymbol.endsWith('USDT')) {
            assets.add(upperSymbol.replace('USDT', ''));
        } else if (upperSymbol.endsWith('USDC')) {
            assets.add(upperSymbol.replace('USDC', ''));
        } else if (upperSymbol.endsWith('FDUSD')) {
            assets.add(upperSymbol.replace('FDUSD', ''));
        }
        
        // Also add quote currencies as tradeable assets
        if (upperSymbol.includes('USDT')) assets.add('USDT');
        if (upperSymbol.includes('USDC')) assets.add('USDC');
        if (upperSymbol.includes('FDUSD')) assets.add('FDUSD');
    });
    
    return Array.from(assets);
};

// Get latest prices for all trading pairs
const getLatestPrices = async (): Promise<{ [symbol: string]: number }> => {
    const client = await pool.connect();

    try {
        const query = `
            SELECT DISTINCT ON (symbol) 
                symbol,
                close as price
            FROM trades_1m
            WHERE bucket >= NOW() - INTERVAL '24 hours'
            ORDER BY symbol, bucket DESC;
        `;

        const result = await client.query(query);
        const prices: { [symbol: string]: number } = {};

        result.rows.forEach((row: any) => {
            prices[row.symbol.toUpperCase()] = parseFloat(row.price);
        });

        return prices;

    } catch (error) {
        console.error('Error fetching latest prices:', error);
        return {};
    } finally {
        client.release();
    }
};

// Calculate buy/sell prices with spread
const calculatePrices = (marketPrice: number, spreadPercent: number = 0.1): { buyPrice: number; sellPrice: number } => {
    const spread = marketPrice * (spreadPercent / 100);
    return {
        buyPrice: Math.floor((marketPrice + spread) * 10000), // Convert to 4 decimal places as integer
        sellPrice: Math.floor((marketPrice - spread) * 10000)
    };
};

// Get available trading symbols from database
export const getAvailableTradingSymbols = async (): Promise<string[]> => {
    const client = await pool.connect();

    try {
        const query = `
            SELECT DISTINCT symbol 
            FROM trades_1m 
            ORDER BY symbol;
        `;

        const result = await client.query(query);
        return result.rows.map((row: any) => row.symbol);

    } catch (error) {
        console.error('Error fetching trading symbols:', error);
        return [];
    } finally {
        client.release();
    }
};

// Main function to get all assets with their current prices
export const getAssets = async (): Promise<AssetData[]> => {
    try {
        // Get available trading pairs from database
        const tradingSymbols = await getAvailableTradingSymbols();
        
        // Extract unique base assets
        const baseAssets = extractBaseAssets(tradingSymbols);
        
        // Get latest prices for all trading pairs
        const latestPrices = await getLatestPrices();
        
        // Build assets array
        const assets: AssetData[] = [];

        baseAssets.forEach(asset => {
            // Find the best price reference for this asset
            let marketPrice = 0;
            
            // Priority order for price references
            const priceReferences = [`${asset}USDT`, `${asset}USDC`, `${asset}FDUSD`];
            
            for (const ref of priceReferences) {
                if (latestPrices[ref]) {
                    marketPrice = latestPrices[ref];
                    break;
                }
            }

            // Skip if no price found
            if (marketPrice === 0) {
                console.warn(`No price found for asset: ${asset}`);
                return;
            }

            // Calculate buy/sell prices with spread
            const { buyPrice, sellPrice } = calculatePrices(marketPrice);

            // Get metadata or use defaults
            const metadata = assetMetadata[asset] || {
                name: asset,
                imageUrl: `https://via.placeholder.com/32x32.png?text=${asset}`
            };

            assets.push({
                name: metadata.name,
                symbol: asset,
                buyPrice,
                sellPrice,
                decimals: 4,
                imageUrl: metadata.imageUrl
            });
        });

        // Sort by symbol for consistent ordering
        return assets.sort((a, b) => a.symbol.localeCompare(b.symbol));

    } catch (error) {
        console.error('Error getting assets:', error);
        throw error;
    }
};

// Get single asset by symbol
export const getAssetBySymbol = async (symbol: string): Promise<AssetData | null> => {
    try {
        const assets = await getAssets();
        return assets.find(asset => asset.symbol.toUpperCase() === symbol.toUpperCase()) || null;
    } catch (error) {
        console.error(`Error getting asset ${symbol}:`, error);
        throw error;
    }
};
