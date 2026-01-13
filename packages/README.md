# Exchange Packages

Shared packages for the Exchange monorepo.

## Packages

### @exchange/typescript-config
Shared TypeScript configurations for all apps and packages.
- `base.json` - Base configuration for Node.js/Bun packages
- `library.json` - Configuration for library packages with build output
- `nextjs.json` - Configuration for Next.js applications

### @exchange/config
Centralized environment configuration. Loads `.env` from the monorepo root and exports typed configuration objects:
- `databaseConfig` - Database connection settings
- `redisConfig` - Redis connection settings
- `serverConfig` - Server/port settings
- `authConfig` - JWT, session, and OAuth settings
- `notificationConfig` - Email and SMS service settings

### @exchange/db
Shared database package with Prisma client and TimescaleDB utilities:
- Prisma client with PostgreSQL adapter
- Schema and migrations
- TimescaleDB pool and timeframe constants

### @exchange/redis
Shared Redis utilities:
- Singleton Redis client
- Publisher for pub/sub messaging
- Subscriber with price update callbacks

### @exchange/monitoring
Prometheus metrics for observability:
- HTTP request metrics
- Authentication metrics
- Trading metrics
- API performance metrics
- WebSocket metrics

## Usage

Add any package as a workspace dependency:

```json
{
  "dependencies": {
    "@exchange/config": "workspace:*",
    "@exchange/db": "workspace:*",
    "@exchange/redis": "workspace:*",
    "@exchange/monitoring": "workspace:*"
  },
  "devDependencies": {
    "@exchange/typescript-config": "workspace:*"
  }
}
```

Then import:

```typescript
import { databaseConfig, redisConfig } from '@exchange/config';
import { prisma, pool } from '@exchange/db';
import { publish, subscribeToPrice } from '@exchange/redis';
import { httpRequestDuration, collectDefaultMetrics } from '@exchange/monitoring';
```

## Creating a New Package

```bash
mkdir packages/package-name
cd packages/package-name
bun init -y
```

Update the package name to use the workspace scope:

```json
{
  "name": "@exchange/package-name",
  "private": true,
  "version": "1.0.0",
  "devDependencies": {
    "@exchange/typescript-config": "workspace:*"
  }
}
```

Create tsconfig.json:

```json
{
  "extends": "@exchange/typescript-config/library.json",
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```
