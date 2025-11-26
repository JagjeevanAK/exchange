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
│   └── notification-worker/ # Kafka consumer for notifications
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

# Start infrastructure services (databases, Redis, Kafka)
bun run docker:up

# Run all apps in development mode
bun run dev
```

## Available Scripts

### Root Level

- `bun run dev` - Start all apps in development mode
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

**Tech Stack:** Express, Prisma, PostgreSQL, Redis, Kafka, Passport.js

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

Kafka consumer that sends email and SMS notifications.

**Tech Stack:** Bun, Kafka, Resend, Twilio

```bash
cd apps/notification-worker
bun run dev        # Development mode
bun run build      # Build for production
```

## Docker Setup

All Dockerfiles are centralized in the `docker/` directory for better organization.

### Start All Services

```bash
docker-compose up -d
```

### Infrastructure Services

- **TimescaleDB** (PostgreSQL): Port 5433
- **Redis**: Port 6379
- **Kafka**: Port 9092
- **Zookeeper**: Port 2181

### Application Services

- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000
- **WS Gateway**: ws://localhost:8080

## Environment Variables

Create `.env` files in each app directory:

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5433/postgres
TIMESCALE_DATABASE_URL=postgresql://user:password@localhost:5433/postgres
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
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
KAFKA_BROKERS=localhost:9092
RESEND_API_KEY=your-resend-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
```

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