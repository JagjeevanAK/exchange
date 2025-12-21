# Database Setup Guide

## Overview

The Exchange platform uses **TimescaleDB** (PostgreSQL-compatible) for all data storage:

- User data, trades, holdings (Prisma ORM) - **Backend**
- Time-series candle/market data (TimescaleDB extensions) - **Poller**

### Services Using Database

- **Backend** (`apps/backend`): Prisma ORM for user/trade data
- **Poller** (`apps/poller`): Direct SQL for time-series candle data

Both services connect to the same TimescaleDB instance.

## Quick Start

### 1. Start Database

```bash
# From root directory
docker-compose up -d timescaledb

# Check if it's running
docker ps | grep timescaledb
```

### 2. Configure Environment

Both **backend** and **poller** need database access.

**Backend** (`.env` in `apps/backend`):

```env
DATABASE_URL=postgresql://user:password@localhost:5433/postgres
TIMESCALE_DATABASE_URL=postgresql://user:password@localhost:5433/postgres
```

**Poller** (`.env` in `apps/poller`):

```env
DATABASE_URL=postgresql://user:password@localhost:5433/postgres
REDIS_URL=redis://localhost:6379
```

### 3. Run Migrations

```bash
cd apps/backend
npx prisma migrate dev --name init
```

### 4. Generate Prisma Client

```bash
bun run generate
```

## Database Details

- **Image**: `timescale/timescaledb-ha:pg17`
- **Host**: `localhost` (or `timescaledb` from within Docker)
- **Port**: `5433` (mapped from container port 5432)
- **Database**: `postgres`
- **Username**: `user`
- **Password**: `password`

## Common Commands

### Connect to Database

```bash
# Using psql
psql postgresql://user:password@localhost:5433/postgres

# Or via Docker
docker exec -it timescaledb_container psql -U user -d postgres
```

### View Tables

```sql
\dt
```

### View Schema

```sql
\d "User"
\d "Trade"
\d "Holding"
```

### Reset Database

```bash
cd apps/backend

# Reset and reapply migrations
npx prisma migrate reset

# Or manually drop and recreate
psql postgresql://user:password@localhost:5433/postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npx prisma migrate dev
```

## Prisma Commands

### Create Migration

```bash
cd apps/backend
npx prisma migrate dev --name your_migration_name
```

### Apply Migrations (Production)

```bash
npx prisma migrate deploy
```

### Generate Client

```bash
bun run generate
# or
npx prisma generate
```

### Open Prisma Studio

```bash
npx prisma studio
```

This opens a GUI at http://localhost:5555 to view/edit data.

### View Migration Status

```bash
npx prisma migrate status
```

## Schema Models

### User

- `id`: UUID (primary key)
- `email`: String (unique)
- `password`: String (hashed)
- `balance`: JSON (tradable & locked USD)
- `trades`: Relation to Trade[]
- `holdings`: Relation to Holding[]
- Timestamps: `createdAt`, `updatedAt`

### Trade

- `id`: UUID (primary key)
- `userId`: String (foreign key)
- `asset`: String
- `type`: Enum (BUY, SELL, LONG, SHORT)
- `status`: Enum (OPEN, CLOSED)
- `margin`: Float
- `amount`: Float
- `quantity`: Float
- `leverage`: Int
- Timestamps: `createdAt`, `updatedAt`

### Holding

- `id`: UUID (primary key)
- `userId`: String (foreign key)
- `asset`: String
- `quantity`: Float
- `averagePrice`: Float
- Unique constraint on (userId, asset)
- Timestamps: `createdAt`, `updatedAt`

## TimescaleDB Features

For time-series data (candles/market data), TimescaleDB provides:

### Create Hypertable

```sql
CREATE TABLE candles (
  time TIMESTAMPTZ NOT NULL,
  symbol TEXT NOT NULL,
  open DOUBLE PRECISION,
  high DOUBLE PRECISION,
  low DOUBLE PRECISION,
  close DOUBLE PRECISION,
  volume DOUBLE PRECISION
);

SELECT create_hypertable('candles', 'time');
```

### Query Recent Data

```sql
SELECT * FROM candles
WHERE symbol = 'BTC/USD'
  AND time > NOW() - INTERVAL '1 day'
ORDER BY time DESC;
```

### Continuous Aggregates

```sql
CREATE MATERIALIZED VIEW candles_1h
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS bucket,
       symbol,
       FIRST(open, time) AS open,
       MAX(high) AS high,
       MIN(low) AS low,
       LAST(close, time) AS close,
       SUM(volume) AS volume
FROM candles
GROUP BY bucket, symbol;
```

## Troubleshooting

### Cannot Connect to Database

**Check if TimescaleDB is running:**

```bash
docker ps | grep timescaledb
```

**Check logs:**

```bash
docker logs timescaledb_container
```

**Start TimescaleDB:**

```bash
docker-compose up -d timescaledb
```

### Authentication Failed

Make sure your `.env` file has the correct credentials:

```env
DATABASE_URL=postgresql://user:password@localhost:5433/postgres
```

### Migration Conflicts

If you have migration conflicts:

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or resolve conflicts manually
npx prisma migrate resolve --applied <migration_name>
```

### Port Already in Use

If port 5433 is already in use, change it in `docker-compose.yml`:

```yaml
ports:
  - '5434:5432' # Use 5434 instead
```

Then update `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5434/postgres
```

### Prisma Client Out of Sync

If you see "Prisma Client is not up to date", run:

```bash
bun run generate
```

## Production Considerations

1. **Use Strong Credentials**: Change default `user:password`
2. **Enable SSL**: Configure `sslmode=require` in DATABASE_URL
3. **Backup Strategy**: Set up automated backups
4. **Connection Pooling**: Use PgBouncer or Prisma connection pooling
5. **Monitoring**: Enable TimescaleDB telemetry and Prometheus metrics
6. **Replication**: Set up TimescaleDB replication for HA
7. **Retention Policies**: Set up data retention for time-series data

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
