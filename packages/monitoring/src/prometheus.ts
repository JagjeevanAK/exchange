import * as client from 'prom-client';

// HTTP Request Metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Authentication metrics
export const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'], // method: 'login', 'google', 'signup'; status: 'success', 'failure'
});

export const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
});

export const sessionsTotal = new client.Counter({
  name: 'sessions_total',
  help: 'Total number of user sessions created',
});

// Trading metrics
export const tradesTotal = new client.Counter({
  name: 'trades_total',
  help: 'Total number of trades',
  labelNames: ['type', 'status'], // type: 'buy', 'sell'; status: 'open', 'closed', 'failed'
});

export const tradeValue = new client.Histogram({
  name: 'trade_value_histogram',
  help: 'Distribution of trade values',
  labelNames: ['type'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000],
});

export const openTradesGauge = new client.Gauge({
  name: 'open_trades_count',
  help: 'Number of currently open trades',
  labelNames: ['user_id'],
});

export const portfolioValue = new client.Gauge({
  name: 'portfolio_value',
  help: 'Current portfolio value per user',
  labelNames: ['user_id'],
});

// API Performance metrics
export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const apiErrors = new client.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['route', 'error_type'],
});

// Business metrics
export const balanceUpdates = new client.Counter({
  name: 'balance_updates_total',
  help: 'Total number of balance updates',
  labelNames: ['user_id', 'type'], // type: 'deposit', 'withdrawal', 'trade'
});

export const candleDataRequests = new client.Counter({
  name: 'candle_data_requests_total',
  help: 'Total number of candle data requests',
  labelNames: ['symbol', 'timeframe'],
});

// WebSocket metrics
export const wsConnections = new client.Gauge({
  name: 'websocket_connections_total',
  help: 'Number of active WebSocket connections',
});

export const wsMessages = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'type'], // direction: 'in', 'out'; type: 'subscribe', 'unsubscribe', 'data'
});

export { client as promClient };
export const register = client.register;

// Utility to collect default metrics
export function collectDefaultMetrics() {
  client.collectDefaultMetrics({ register: client.register });
}
