#!/bin/bash
# Bash script to start development environment
# Usage: ./start-dev.sh

set -e

echo "🚀 Starting FinTrack Pro Development Environment"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    exit 1
fi
echo "✅ Docker is running"

# Start development databases
echo ""
echo "📦 Starting MongoDB and Redis..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for databases to be ready
echo ""
echo "⏳ Waiting for databases to be ready..."
sleep 3

# Check if MongoDB is ready
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec fintrack-mongodb-dev mongosh --eval "db.runCommand('ping').ok" --quiet > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ MongoDB failed to start"
        exit 1
    fi
    echo "   Waiting for MongoDB... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done
echo "✅ MongoDB is ready"

# Check if Redis is ready
RETRY_COUNT=0
until docker exec fintrack-redis-dev redis-cli ping 2>/dev/null | grep -q "PONG"; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Redis failed to start"
        exit 1
    fi
    echo "   Waiting for Redis... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done
echo "✅ Redis is ready"

echo ""
echo "========================================"
echo "📊 Development Environment Ready!"
echo "========================================"
echo ""
echo "Database URLs:"
echo "  MongoDB:        mongodb://localhost:27017"
echo "  Redis:          redis://localhost:6379"
echo ""
echo "Management UIs:"
echo "  Redis Commander: http://localhost:8081"
echo "  Mongo Express:   http://localhost:8082"
echo ""
echo "Next Steps:"
echo "  1. Backend:  cd backend && npm run dev"
echo "  2. Frontend: cd frontend && npm run dev"
echo "  3. ML:       cd ml-service && python run.py"
echo ""
echo "To stop: docker-compose -f docker-compose.dev.yml down"
