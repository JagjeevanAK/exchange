#!/bin/bash

# Test script to verify BullMQ notification setup

echo "Testing BullMQ Notification System"
echo "===================================="
echo ""

# Check if Redis is running
echo "1. Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "   ✓ Redis is running"
else
    echo "   ✗ Redis is not running. Start it with: docker run -d -p 6379:6379 redis:7-alpine"
    exit 1
fi

# Check Redis keys
echo ""
echo "2. Checking BullMQ queues in Redis..."
QUEUE_KEYS=$(redis-cli --raw KEYS "bull:notifications:*" 2>/dev/null | wc -l)
echo "   Found $QUEUE_KEYS BullMQ keys"

# Check if notification worker is running
echo ""
echo "3. Checking notification worker..."
if docker ps | grep -q "exchange-notification-worker"; then
    echo "   ✓ Notification worker container is running"
    echo "   Recent logs:"
    docker logs --tail 5 exchange-notification-worker 2>/dev/null | sed 's/^/     /'
else
    echo "   ✗ Notification worker is not running in Docker"
    echo "   Start with: docker-compose up -d notification-worker"
fi

# Check if backend is running
echo ""
echo "4. Checking backend..."
if docker ps | grep -q "exchange-backend"; then
    echo "   ✓ Backend container is running"
else
    echo "   ✗ Backend is not running in Docker"
    echo "   Start with: docker-compose up -d backend"
fi

# Check job stats
echo ""
echo "5. Queue Statistics:"
if command -v redis-cli > /dev/null 2>&1; then
    WAITING=$(redis-cli LLEN "bull:notifications:wait" 2>/dev/null || echo "0")
    ACTIVE=$(redis-cli LLEN "bull:notifications:active" 2>/dev/null || echo "0")
    COMPLETED=$(redis-cli ZCARD "bull:notifications:completed" 2>/dev/null || echo "0")
    FAILED=$(redis-cli ZCARD "bull:notifications:failed" 2>/dev/null || echo "0")
    
    echo "   Waiting:   $WAITING"
    echo "   Active:    $ACTIVE"
    echo "   Completed: $COMPLETED"
    echo "   Failed:    $FAILED"
else
    echo "   ✗ redis-cli not found"
fi

echo ""
echo "===================================="
echo "Test complete!"
echo ""
echo "To monitor queue in real-time:"
echo "  redis-cli MONITOR | grep notifications"
echo ""
echo "To view worker logs:"
echo "  docker logs -f exchange-notification-worker"
