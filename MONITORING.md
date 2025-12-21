# Prometheus & Grafana Monitoring

This guide explains how to use the built-in monitoring for the Exchange platform using Prometheus and Grafana.

## Quick Start

```bash
# 1. Start infrastructure (includes Prometheus & Grafana)
bun run docker:up

# 2. Start application services (includes backend with metrics)
bun run dev

# 3. Access monitoring
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3002 (admin/admin)
# - Backend Metrics: http://localhost:3001/metrics
```

## Services

### Prometheus

- **URL**: http://localhost:9090
- **Purpose**: Scrapes and stores metrics from the backend
- **Scrape Interval**: 15 seconds
- **Storage**: Persistent volume (`prometheus_data`)

### Grafana

- **URL**: http://localhost:3002
- **Username**: `admin`
- **Password**: `admin`
- **Purpose**: Visualizes metrics from Prometheus
- **Storage**: Persistent volume (`grafana_data`)

### Backend Metrics Endpoint

- **URL**: http://localhost:3001/metrics
- **Format**: Prometheus exposition format
- **Metrics**: HTTP, Auth, Trading, Performance, System

## Metrics Exposed

### HTTP Metrics

- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Total HTTP requests counter

### Authentication Metrics

- `auth_attempts_total` - Authentication attempts counter
- `active_users` - Currently active users gauge
- `sessions_total` - Total sessions created counter

### Trading Metrics

- `trades_total` - Total trades counter (by type and status)
- `trade_value_histogram` - Trade value distribution
- `open_trades_count` - Currently open trades gauge
- `portfolio_value` - Portfolio value per user gauge

### Performance Metrics

- `database_query_duration_seconds` - Database query duration histogram
- `api_errors_total` - API errors counter

### Business Metrics

- `balance_updates_total` - Balance updates counter
- `candle_data_requests_total` - Candle data requests counter

### System Metrics

Node.js default metrics including:

- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_heap_size_total_bytes` - Heap size
- And more...

## Using Grafana

### First Login

1. Navigate to http://localhost:3002
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. (Optional) Change password when prompted

### Verify Data Source

The Prometheus data source is automatically configured:

1. Go to **Configuration** → **Data Sources**
2. You should see "Prometheus" listed
3. Click **Test** to verify the connection

### Create Your First Dashboard

1. Click **+** → **Dashboard** → **Add new panel**
2. In the query editor, try these queries:

#### Request Rate

```promql
rate(http_requests_total[5m])
```

#### P95 Response Time

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

#### Error Rate

```promql
rate(api_errors_total[5m])
```

#### Active Trades

```promql
sum(open_trades_count)
```

#### Memory Usage

```promql
process_resident_memory_bytes / 1024 / 1024
```

### Useful Queries

#### Request Rate by Route

```promql
sum(rate(http_requests_total[5m])) by (route)
```

#### Request Rate by Status Code

```promql
sum(rate(http_requests_total[5m])) by (status_code)
```

#### Database Query Duration (P50, P95, P99)

```promql
histogram_quantile(0.50, rate(database_query_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(database_query_duration_seconds_bucket[5m]))
```

#### Authentication Success Rate

```promql
sum(rate(auth_attempts_total{status="success"}[5m])) / sum(rate(auth_attempts_total[5m]))
```

#### Trade Volume by Type

```promql
sum(rate(trades_total[5m])) by (type)
```

## Troubleshooting

### Prometheus Shows Target as DOWN

1. **Check if backend is running**:

   ```bash
   curl http://localhost:3001/health
   ```

2. **Check if metrics are accessible**:

   ```bash
   curl http://localhost:3001/metrics
   ```

3. **View Prometheus logs**:

   ```bash
   docker logs exchange-prometheus
   ```

4. **On Linux**: If `host.docker.internal` doesn't work, edit `apps/backend/prometheus.yml` and change the target to `172.17.0.1:3001`

### No Data in Grafana

1. **Verify Prometheus is scraping**:
   - Go to http://localhost:9090/targets
   - The backend target should be "UP"

2. **Check metrics in Prometheus**:
   - Go to http://localhost:9090/graph
   - Try query: `http_requests_total`

3. **Verify time range in Grafana**:
   - Check the time picker (top right)
   - Default is "Last 6 hours"

4. **Test data source**:
   - Configuration → Data Sources → Prometheus → Test

### Port Conflicts

If ports are already in use:

**Prometheus (9090)**:

```yaml
# In docker-compose.yml
ports:
  - '9091:9090' # Use 9091 on host
```

**Grafana (3002)**:

```yaml
# In docker-compose.yml
ports:
  - '3003:3000' # Use 3003 on host
```

### Container Won't Start

```bash
# View logs
docker-compose logs prometheus
docker-compose logs grafana

# Restart services
docker-compose restart prometheus grafana

# Full restart
docker-compose down
docker-compose up -d
```

## Configuration Files

### `docker-compose.yml`

Main configuration including Prometheus and Grafana services.

### `apps/backend/prometheus.yml`

Prometheus scrape configuration:

- Defines scrape targets
- Sets scrape intervals
- Configures metrics paths

### `apps/backend/grafana/prometheus-datasource.yml`

Auto-provisions Prometheus as a Grafana data source.

### `apps/backend/metrics/prometheus.ts`

Defines all custom metrics for the backend application.

## Best Practices

### Dashboards

Create dashboards for:

1. **System Overview**: CPU, memory, request rate, error rate
2. **API Performance**: Latency percentiles, throughput by endpoint
3. **Business Metrics**: Trades, users, balances, portfolio values
4. **Errors**: Error rates, types, affected endpoints

### Alerts

Set up alerts for:

- Error rate > 1%
- P95 latency > 1 second
- Memory usage > 80%
- Failed auth attempts spike
- Database query duration > 5 seconds

### Recording Rules

For frequently used complex queries, create recording rules in Prometheus:

```yaml
groups:
  - name: api_performance
    interval: 30s
    rules:
      - record: api:request_duration_seconds:p95
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Data Retention

By default:

- **Prometheus**: 15 days (configurable via `--storage.tsdb.retention.time`)
- **Grafana**: Persistent dashboards and settings

To change Prometheus retention, edit `docker-compose.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=30d'
```

## Production Recommendations

1. **Use persistent volumes** (already configured)
2. **Set up AlertManager** for notifications
3. **Configure remote storage** for long-term metrics
4. **Enable authentication** in Prometheus
5. **Use strong passwords** for Grafana
6. **Set up HTTPS** with reverse proxy
7. **Configure backup** for Grafana dashboards
8. **Use service discovery** instead of static targets

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [prom-client (Node.js)](https://github.com/simmycloud/prom-client)
