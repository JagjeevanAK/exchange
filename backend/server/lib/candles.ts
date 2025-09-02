import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

interface CandleData {
    timestamp: number;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    decimal: number;
}

interface GetCandlesParams {
    asset: string;
    startTime: number;
    endTime: number;
    timeframe: string;
}

// Map API timeframe to database view names
const timeframeMap: { [key: string]: string } = {
    '1s': '1s',
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',
    '1H': '1H',
    '1d': '1D',
    '1D': '1D',
    '1w': '1W',
    '1W': '1W'
};

export const getCandles = async ({
    asset,
    startTime,
    endTime,
    timeframe
}: GetCandlesParams): Promise<CandleData[]> => {
    const client = await pool.connect();

    try {
        // Validate timeframe
        const dbTimeframe = timeframeMap[timeframe];
        if (!dbTimeframe) {
            throw new Error(`Invalid timeframe: ${timeframe}. Supported: ${Object.keys(timeframeMap).join(', ')}`);
        }

        // Convert Unix timestamps to PostgreSQL timestamps
        const startDate = new Date(startTime * 1000).toISOString();
        const endDate = new Date(endTime * 1000).toISOString();

        // Construct the view name
        const viewName = `trades_${dbTimeframe}`;

        // Query the materialized view
        const query = `
            SELECT 
                EXTRACT(EPOCH FROM bucket) as timestamp,
                open,
                high,
                low,
                close,
                volume
            FROM ${viewName}
            WHERE symbol = $1 
                AND bucket >= $2 
                AND bucket <= $3
            ORDER BY bucket ASC;
        `;

        const result = await client.query(query, [asset, startDate, endDate]);

        // Format the response according to your API specification
        const candles: CandleData[] = result.rows.map((row: any) => ({
            timestamp: Math.floor(row.timestamp),
            open: Math.floor(parseFloat(row.open) * 10000), // Convert to 4 decimal places as integer
            close: Math.floor(parseFloat(row.close) * 10000),
            high: Math.floor(parseFloat(row.high) * 10000),
            low: Math.floor(parseFloat(row.low) * 10000),
            volume: parseFloat(row.volume),
            decimal: 4
        }));

        return candles;

    } catch (error) {
        console.error('Error fetching candles:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Get available symbols
export const getAvailableSymbols = async (): Promise<string[]> => {
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
        console.error('Error fetching available symbols:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Get latest candle for a symbol
export const getLatestCandle = async (asset: string, timeframe: string = '1m'): Promise<CandleData | null> => {
    const client = await pool.connect();

    try {
        const dbTimeframe = timeframeMap[timeframe];
        if (!dbTimeframe) {
            throw new Error(`Invalid timeframe: ${timeframe}`);
        }

        const viewName = `trades_${dbTimeframe}`;

        const query = `
            SELECT 
                EXTRACT(EPOCH FROM bucket) as timestamp,
                open,
                high,
                low,
                close,
                volume
            FROM ${viewName}
            WHERE symbol = $1 
            ORDER BY bucket DESC
            LIMIT 1;
        `;

        const result = await client.query(query, [asset]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            timestamp: Math.floor(row.timestamp),
            open: Math.floor(parseFloat(row.open) * 10000),
            close: Math.floor(parseFloat(row.close) * 10000),
            high: Math.floor(parseFloat(row.high) * 10000),
            low: Math.floor(parseFloat(row.low) * 10000),
            volume: parseFloat(row.volume),
            decimal: 4
        };

    } catch (error) {
        console.error('Error fetching latest candle:', error);
        throw error;
    } finally {
        client.release();
    }
};
