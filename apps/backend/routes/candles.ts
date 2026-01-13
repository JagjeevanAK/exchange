import { Router, type Request, type Response } from 'express';
import { getCandles, getAvailableSymbols, getLatestCandle, getDebugInfo } from '../lib/candles';
import { candleDataRequests, databaseQueryDuration, apiErrors } from '@exchange/monitoring';

const router = Router();

// GET /api/v1/candles?asset=BTC&startTime=unix_timestamp&endTime=unix_timestamp&ts=1m/1w/1d
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { asset, startTime: startTimeParam, endTime, ts } = req.query;

    // Validation
    if (!asset || typeof asset !== 'string') {
      apiErrors.labels('/candles', 'missing_asset').inc();
      return res.status(400).json({
        error: 'Asset parameter is required and must be a string',
      });
    }

    if (!startTimeParam || typeof startTimeParam !== 'string') {
      apiErrors.labels('/candles', 'missing_startTime').inc();
      return res.status(400).json({
        error: 'startTime parameter is required and must be a unix timestamp',
      });
    }

    if (!endTime || typeof endTime !== 'string') {
      apiErrors.labels('/candles', 'missing_endTime').inc();
      return res.status(400).json({
        error: 'endTime parameter is required and must be a unix timestamp',
      });
    }

    if (!ts || typeof ts !== 'string') {
      apiErrors.labels('/candles', 'missing_timeframe').inc();
      return res.status(400).json({
        error: 'ts (timeframe) parameter is required. Supported: 1s, 1m, 5m, 15m, 30m, 1h, 1d, 1w',
      });
    }

    // Parse timestamps
    const startTimestamp = parseInt(startTimeParam);
    const endTimestamp = parseInt(endTime);

    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      apiErrors.labels('/candles', 'invalid_timestamp').inc();
      return res.status(400).json({
        error: 'startTime and endTime must be valid unix timestamps',
      });
    }

    if (startTimestamp >= endTimestamp) {
      apiErrors.labels('/candles', 'invalid_time_range').inc();
      return res.status(400).json({
        error: 'startTime must be less than endTime',
      });
    }

    // Validate time range (prevent too large queries)
    const timeDiff = endTimestamp - startTimestamp;
    const maxTimeRange = {
      '1s': 24 * 60 * 60, // 1 day for 1s candles
      '1m': 30 * 24 * 60 * 60, // 30 days for 1m candles
      '5m': 90 * 24 * 60 * 60, // 90 days for 5m candles
      '15m': 180 * 24 * 60 * 60, // 180 days for 15m candles
      '30m': 365 * 24 * 60 * 60, // 1 year for 30m candles
      '1h': 2 * 365 * 24 * 60 * 60, // 2 years for 1h candles
      '1H': 2 * 365 * 24 * 60 * 60, // 2 years for 1H candles
      '1d': 5 * 365 * 24 * 60 * 60, // 5 years for 1d candles
      '1D': 5 * 365 * 24 * 60 * 60, // 5 years for 1D candles
      '1w': 10 * 365 * 24 * 60 * 60, // 10 years for 1w candles
      '1W': 10 * 365 * 24 * 60 * 60, // 10 years for 1W candles
    };

    const maxRange = maxTimeRange[ts as keyof typeof maxTimeRange];
    if (maxRange && timeDiff > maxRange) {
      apiErrors.labels('/candles', 'time_range_too_large').inc();
      return res.status(400).json({
        error: `Time range too large for ${ts} timeframe. Maximum allowed: ${Math.floor(maxRange / (24 * 60 * 60))} days`,
      });
    }

    // Record the candle data request
    candleDataRequests.labels(asset.toUpperCase(), ts).inc();

    // Track database query time
    const dbStartTime = Date.now();

    // Fetch candles from TimescaleDB
    const candles = await getCandles({
      asset: asset.toUpperCase(),
      startTime: startTimestamp,
      endTime: endTimestamp,
      timeframe: ts,
    });

    // Record database query duration
    const dbQueryDuration = (Date.now() - dbStartTime) / 1000;
    databaseQueryDuration.labels('select', 'candles').observe(dbQueryDuration);

    res.status(200).json({
      candles,
    });
  } catch (error) {
    console.error('Error fetching candles:', error);

    // Record API error with specific error type
    const errorType = error instanceof Error ? error.name : 'unknown_error';
    apiErrors.labels('/candles', errorType).inc();

    if (error instanceof Error && error.message.includes('Invalid timeframe')) {
      apiErrors.labels('/candles', 'invalid_timeframe').inc();
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal server error while fetching candles',
    });
  }
});

// GET /api/v1/candles/symbols - Get all available symbols in TSDB
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const symbols = await getAvailableSymbols();
    res.status(200).json({ symbols });
  } catch (error) {
    console.error('Error fetching symbols:', error);
    res.status(500).json({
      error: 'Internal server error while fetching symbols',
    });
  }
});

// GET /api/v1/candles/latest?asset=BTC&ts=1m - Get latest candle
router.get('/latest', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { asset, ts = '1m' } = req.query;

    if (!asset || typeof asset !== 'string') {
      apiErrors.labels('/candles/latest', 'missing_asset').inc();
      return res.status(400).json({
        error: 'Asset parameter is required',
      });
    }

    // Record the latest candle request
    candleDataRequests.labels(asset.toUpperCase(), `${ts}_latest`).inc();

    // Track database query time
    const dbStartTime = Date.now();

    const latestCandle = await getLatestCandle(asset.toUpperCase(), ts as string);

    // Record database query duration
    const dbQueryDuration = (Date.now() - dbStartTime) / 1000;
    databaseQueryDuration.labels('select', 'latest_candle').observe(dbQueryDuration);

    if (!latestCandle) {
      return res.status(404).json({
        error: `No candle data found for ${asset}`,
      });
    }

    res.status(200).json({
      candle: latestCandle,
    });
  } catch (error) {
    console.error('Error fetching latest candle:', error);

    // Record API error with specific error type
    const errorType = error instanceof Error ? error.name : 'unknown_error';
    apiErrors.labels('/candles/latest', errorType).inc();

    if (error instanceof Error && error.message.includes('Invalid timeframe')) {
      apiErrors.labels('/candles/latest', 'invalid_timeframe').inc();
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal server error while fetching latest candle',
    });
  }
});

// GET /api/v1/candles/debug - Debug endpoint to check TSDB status
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const { asset } = req.query;
    const debugInfo = await getDebugInfo(asset as string | undefined);
    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Error fetching debug info:', error);
    res.status(500).json({
      error: 'Internal server error while fetching debug info',
    });
  }
});

export default router;
