#!/bin/bash
# Bash script to start production environment
# Usage: ./start-prod.sh

set -e

echo "🚀 Starting FinTrack Pro Production Environment"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    exit 1
fi
echo "✅ Docker is running"

# Check for .env file
if [ ! -f "backend/.env" ]; then
    echo "⚠️  No backend/.env file found. Copying from .env.example..."
    cp backend/.env.example backend/.env
    echo "   Please update backend/.env with your production values"
fi

# Build and start all services
echo ""
echo "🏗️  Building Docker images..."
docker-compose build

echo ""
echo "📦 Starting all services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Health checks
echo ""
echo "🔍 Checking service health..."

# Check Backend
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "⏳ Backend API is starting up..."
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⏳ Frontend is starting up..."
fi

# Check ML Service
if curl -s http://localhost:8000/healthz > /dev/null 2>&1; then
    echo "✅ ML Service is healthy"
else
    echo "⏳ ML Service is starting up..."
fi

echo ""
echo "========================================"
echo "📊 FinTrack Pro Production Ready!"
echo "========================================"
echo ""
echo "Services:"
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:5000/api"
echo "  ML Service:   http://localhost:8000"
echo "  API Docs:     http://localhost:8000/docs"
echo ""
echo "Commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         docker-compose down"
echo "  Restart:      docker-compose restart"
