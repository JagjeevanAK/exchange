# Backend API

Express.js API server for the Exchange platform.

## Development

Located inside `apps/backend` of the turborepo.

### Install dependencies

```bash
bun install
```

### Run

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun run start
```

### Generate Prisma Client

```bash
bun run generate
```

### Available Endpoints

- **API**: http://localhost:3001/api/v1/
- **Health Check**: http://localhost:3001/health
- **Metrics**: http://localhost:3001/metrics (Prometheus format)

## Monitoring

The backend exposes Prometheus metrics at `/metrics` endpoint.

To start Prometheus and Grafana, use the main docker-compose:

```bash
# From root directory
docker-compose up -d
```

Access:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/admin)

See [MONITORING.md](../../MONITORING.md) in the root directory for detailed setup.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis, BullMQ
- **Auth**: Passport.js (Local + Google OAuth)
- **Monitoring**: prom-client (Prometheus metrics)
