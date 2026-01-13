import { Pool } from 'pg';
import { databaseConfig } from '@exchange/config';

// Shared pool for raw queries (TimescaleDB, etc.)
export const pool = new Pool({
  connectionString: databaseConfig.url,
  min: databaseConfig.poolMin,
  max: databaseConfig.poolMax,
});

// Timeframes for TimescaleDB continuous aggregates
export const timeframes = [
  { name: '1s', interval: '1 second' },
  { name: '1m', interval: '1 minute' },
  { name: '5m', interval: '5 minutes' },
  { name: '15m', interval: '15 minutes' },
  { name: '30m', interval: '30 minutes' },
  { name: '1h', interval: '1 hour' },
  { name: '1d', interval: '1 day' },
  { name: '1w', interval: '1 week' },
] as const;

export type Timeframe = (typeof timeframes)[number]['name'];
