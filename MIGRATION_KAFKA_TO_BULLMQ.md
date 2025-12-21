# Migration from Kafka to BullMQ

This document outlines the migration from Kafka to BullMQ for the notification service.

## What Changed

### Architecture

- **Before**: Kafka + Zookeeper for message queuing
- **After**: BullMQ + Redis for job queuing

### Benefits

- Simpler infrastructure (only Redis needed, already in use)
- Better job tracking and monitoring
- Built-in retry mechanisms
- Lower resource footprint
- Easier to develop and debug locally

## Changes Made

### 1. Docker Compose

- Removed Kafka and Zookeeper services
- Updated backend to remove Kafka dependency
- Updated notification-worker to use Redis instead of Kafka

### 2. Backend (`apps/backend`)

- **Removed**: `lib/kafka-producer.ts`
- **Added**: `lib/notification-queue.ts`
  - Uses BullMQ Queue to send notification jobs
  - Includes retry logic and job persistence
- **Updated**: `package.json`
  - Removed: `kafkajs`
  - Added: `bullmq` (ioredis already present)

- **Updated**: `routes/trade.ts`
  - Integrated notification queue
  - Sends notification after successful trade execution

### 3. Notification Worker (`apps/notification-worker`)

- **Rewritten**: `index.ts`
  - Uses BullMQ Worker instead of Kafka Consumer
  - Processes notification jobs with concurrency control
  - Better error handling and logging
- **Updated**: `package.json`
  - Removed: `kafkajs`
  - Added: `bullmq`, `ioredis`

### 4. Environment Variables

- **Removed**: `KAFKA_BROKERS`
- **Using**: `REDIS_URL` (already existed)

## How to Use

### Sending Notifications (Backend)

```typescript
import { sendNotification } from '../lib/notification-queue';

// Send a notification
await sendNotification({
  to: 'user@example.com',
  asset: 'BTC',
  amount: 1000,
  quantity: 0.02,
  order: 'order-id-123',
});
```

### Queue Configuration

The queue is configured with:

- **Attempts**: 3 retries on failure
- **Backoff**: Exponential (2s, 4s, 8s)
- **Concurrency**: 5 jobs processed simultaneously
- **Rate Limiting**: Max 10 jobs per second

### Worker Features

The notification worker:

- Sends both email (via Resend) and SMS (via Twilio)
- Logs job completion and failures
- Handles graceful shutdown
- Automatically retries failed jobs

## Running the Services

### Development (Local)

```bash
# Start Redis (if not already running)
docker run -d -p 6379:6379 redis:7-alpine

# Install dependencies
bun install

# Start backend
cd apps/backend
bun run dev

# Start notification worker
cd apps/notification-worker
bun run dev
```

### Production (Docker)

```bash
# Start all services
docker-compose up -d

# View notification worker logs
docker logs -f exchange-notification-worker

# View backend logs
docker logs -f exchange-backend
```

## Monitoring Jobs

BullMQ provides excellent monitoring capabilities. You can:

1. **Install Bull Board** (optional dashboard):

```bash
bun add @bull-board/api @bull-board/express
```

2. **Monitor with Redis CLI**:

```bash
redis-cli
> KEYS bull:notifications:*
```

3. **Check job status programmatically**:

```typescript
import notificationQueue from './lib/notification-queue';

// Get job counts
const counts = await notificationQueue.getJobCounts();
console.log(counts); // { waiting, active, completed, failed }

// Get failed jobs
const failed = await notificationQueue.getFailed();
```

## Troubleshooting

### Jobs not processing

- Check Redis connection: `redis-cli ping`
- Verify notification worker is running
- Check worker logs for errors

### Notifications not sending

- Verify Resend API key is set
- Verify Twilio credentials (if using SMS)
- Check job failure logs in Redis

### High job queue

- Increase worker concurrency
- Add more worker instances
- Check for email/SMS service issues

## Rollback (if needed)

If you need to rollback to Kafka:

1. Restore Kafka services in `docker-compose.yml`
2. Restore `kafkajs` in package.json files
3. Restore `lib/kafka-producer.ts` from git history
4. Revert notification-worker to use Kafka consumer

However, BullMQ is recommended for its simplicity and reliability.
