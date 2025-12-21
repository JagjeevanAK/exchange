# Exchange Turborepo

A high-performance cryptocurrency exchange platform built as a Turborepo monorepo.

## Project Structure

```
exchange/
├── apps/
│   ├── backend/           # Express.js API server
│   ├── frontend/          # Next.js web application
│   ├── poller/            # Market data polling service
│   ├── ws-gateway/        # WebSocket gateway
│   └── notification-worker/ # BullMQ worker for notifications
├── docker/                # All Dockerfiles
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── poller.Dockerfile
│   ├── ws-gateway.Dockerfile
│   └── notification-worker.Dockerfile
├── packages/              # Shared packages (future)
└── docker-compose.yml     # Docker orchestration
```

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Bun** >= 1.0.0
- **Docker** and **Docker Compose**

### Installation

```bash
# Install dependencies
bun install

# Start infrastructure services (TimescaleDB and Redis)
bun run docker:up

# Run all apps in development mode with proper ordering
bun run dev
```

## Development Workflow

### 1. Start Infrastructure Services

```bash
# Start TimescaleDB and Redis
bun run docker:up

# Check if services are running
docker ps
```

### 2. Run Application Services

```bash
# Start all apps in order: Poller → Backend → Notification Worker → WS Gateway → Frontend
bun run dev

# Press Ctrl+C to stop all services
```

## Development Startup Order

The `bun run dev` command uses a custom Node.js script (`scripts/dev.js`) to start services in the correct order:

1. **Poller** - Starts first to begin collecting market data
2. **Backend** - API server starts after poller is ready
3. **Notification Worker** - Starts to process notification jobs
4. **WS Gateway** - WebSocket server for real-time updates
5. **Frontend** - Web application starts last

Each service waits for the previous one to initialize before starting.

## Available Scripts

### Root Level

- `bun run dev` - Start all apps in correct order (Poller → Backend → Notification → WS → Frontend)
- `bun run dev:all` - Start all apps in parallel using Turborepo (no ordering)
- `bun run build` - Build all apps
- `bun run start` - Start all apps in production mode
- `bun run lint` - Lint all apps
- `bun run format` - Format all files with Prettier
- `bun run clean` - Clean all build outputs and node_modules

### Docker Commands

- `bun run docker:up` - Start all Docker services
- `bun run docker:down` - Stop all Docker services
- `bun run docker:build` - Build all Docker images
- `bun run docker:logs` - View Docker logs

## Apps

### Backend (`apps/backend`)

Express.js API server with Prisma ORM, JWT authentication, and Kafka integration.

**Tech Stack:** Express, Prisma, PostgreSQL, Redis, BullMQ, Passport.js

```bash
cd apps/backend
bun run dev        # Development mode
bun run build      # Build for production
bun run generate   # Generate Prisma client
```

### Frontend (`apps/frontend`)

Next.js web application with TradingView charts and real-time market data.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Radix UI

```bash
cd apps/frontend
bun run dev        # Development mode
bun run build      # Build for production
bun run start      # Start production server
```

### Poller (`apps/poller`)

Service that polls market data from external sources and stores in TimescaleDB.

**Tech Stack:** Bun, PostgreSQL, Redis, WebSockets

```bash
cd apps/poller
bun run dev        # Development mode
bun run build      # Build for production
```

### WS Gateway (`apps/ws-gateway`)

WebSocket gateway for real-time price updates to clients.

**Tech Stack:** Bun, WebSocket, Redis

```bash
cd apps/ws-gateway
bun run dev        # Development mode
bun run build      # Build for production
```

### Notification Worker (`apps/notification-worker`)

BullMQ worker that sends email and SMS notifications for trade executions.

**Tech Stack:** Bun, BullMQ, Redis, Resend, Twilio

```bash
cd apps/notification-worker
bun run dev        # Development mode
bun run build      # Build for production
```

## Docker Setup

Docker Compose is configured to run only infrastructure services. Application services are run locally for faster development.

### Infrastructure Services

```bash
# Start infrastructure
docker-compose up -d

# View logs
docker-compose logs -f

# Stop infrastructure
docker-compose down
```

The following services will be started:

- **TimescaleDB** (PostgreSQL): Port 5433
- **Redis**: Port 6379
- **Prometheus**: Port 9090
- **Grafana**: Port 3002 (username: admin, password: admin)

### Application Services

All application services (backend, frontend, poller, ws-gateway, notification-worker) are run locally using:

```bash
bun run dev
```

This approach provides:

- Faster development workflow
- Better debugging capabilities
- Easier hot-reload and file watching
- Lower resource usage

### Monitoring

Once infrastructure is running:

1. **Start backend** to expose metrics: `bun run dev`
2. **Access Prometheus**: http://localhost:9090
3. **Access Grafana**: http://localhost:3002 (admin/admin)
4. **View metrics**: http://localhost:3001/metrics

See [MONITORING.md](./MONITORING.md) for detailed monitoring setup.

## Environment Variables

Create `.env` files in each app directory:

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5433/postgres
TIMESCALE_DATABASE_URL=postgresql://user:password@localhost:5433/postgres
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-key
PORT=3001
NODE_ENV=development
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Notification Worker (`.env`)

```env
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=your-resend-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
```

See `.env.example` in the root directory for a complete list of environment variables.

## 🔍 Turborepo Features

### Pipeline Caching

Turborepo intelligently caches task outputs to speed up subsequent builds.

### Parallel Execution

Tasks are executed in parallel across all apps when possible.

### Task Dependencies

Tasks automatically run in the correct order based on dependencies defined in `turbo.json`.

### Remote Caching (Optional)

Enable remote caching by linking to Vercel:

```bash
npx turbo login
npx turbo link
```

## Database Migrations

```bash
cd apps/backend
bunx prisma migrate dev --name migration_name
bunx prisma generate
```

## Development Tips

1. **Run specific app:**

   ```bash
   turbo run dev --filter=backend
   ```

2. **Build specific app:**

   ```bash
   turbo run build --filter=frontend
   ```

3. **Clear Turborepo cache:**

   ```bash
   turbo run build --force
   ```

4. **View Turborepo execution graph:**

   ```bash
   turbo run dev --graph
   ```

5. **Run tasks in parallel (skip ordering):**
   ```bash
   turbo run dev --parallel
   ```

## Troubleshooting

### Check Redis connection

```bash
redis-cli ping
```

### Database issues

```bash
# Check if TimescaleDB is running
docker ps | grep timescaledb

# View database logs
docker logs timescaledb_container
```

### View service startup order

The startup order is configured in `turbo.json`:

- `poller#dev` → `backend#dev` → `notification-worker#dev` → `ws-gateway#dev` → `frontend#dev`

## Additional Documentation

- [Kafka to BullMQ Migration Guide](./MIGRATION_KAFKA_TO_BULLMQ.md)
- [Docker Setup Guide](./Docker-README.md)

2. **Build specific app:**

   ```bash
   turbo run build --filter=frontend
   ```

3. **Clear Turborepo cache:**
   ```bash
   turbo run build --force
   ```
