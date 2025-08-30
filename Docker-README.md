# Exchange Platform - Docker Setup

This repository contains a cryptocurrency exchange platform with the following services:

## Services

- **PostgreSQL**: Database for storing user data, trades, and holdings
- **Redis**: Pub/sub messaging and caching
- **Server**: Express.js API server with Prisma ORM
- **Poller**: Service that connects to Binance WebSocket for real-time data
- **WS Gateway**: WebSocket server for client connections

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB of RAM available

### Setup

1. **Clone and navigate to the project:**
   ```bash
   cd exchange
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your preferred configurations.

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database:**
   ```bash
   # Wait for services to be healthy, then run migrations
   docker-compose exec server bunx prisma migrate dev
   ```

5. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f server
   ```

### Development Mode

For development with hot reload:

```bash
# Start with development volumes mounted
docker-compose up -d

# The services will automatically restart when code changes
```

### Production Mode

For production deployment:

1. Update environment variables in `.env`
2. Set `NODE_ENV=production`
3. Use production database credentials
4. Enable SSL/TLS for secure connections

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Service URLs

- **API Server**: http://localhost:3000
- **WebSocket Gateway**: ws://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## API Endpoints

- `POST /api/v1/signup` - User registration
- `POST /api/v1/signin` - User authentication
- `GET /api/v1/balance` - Get user balance

## WebSocket Events

Connect to `ws://localhost:8080` and subscribe to trading symbols:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbol: 'BTCUSDT'
  }));
};
```

## Troubleshooting

### Services not starting

1. Check if ports are available:
   ```bash
   docker-compose ps
   ```

2. View service logs:
   ```bash
   docker-compose logs service-name
   ```

3. Rebuild services:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Database connection issues

1. Ensure PostgreSQL is healthy:
   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```

2. Run database migrations:
   ```bash
   docker-compose exec server bunx prisma migrate dev
   ```

### Redis connection issues

1. Check Redis connectivity:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

## Monitoring

### Health Checks

All services include health checks. Check status:

```bash
docker-compose ps
```

### Resource Usage

Monitor resource usage:

```bash
docker stats
```

## Cleanup

Stop and remove all containers:

```bash
docker-compose down

# Remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

## Development

### Adding New Services

1. Create a new directory under `backend/` or `frontend/`
2. Add service definition to `docker-compose.yml`
3. Create corresponding `Dockerfile`
4. Update this README

### Database Changes

1. Modify `backend/server/prisma/schema.prisma`
2. Generate migration:
   ```bash
   docker-compose exec server bunx prisma migrate dev --name migration-name
   ```

### Environment Variables

Add new environment variables to:
- `.env.example` (template)
- `docker-compose.yml` (service environment)
- Service-specific environment handling
