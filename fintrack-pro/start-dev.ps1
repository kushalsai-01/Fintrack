# PowerShell script to start development environment
# Usage: .\start-dev.ps1

Write-Host "🚀 Starting FinTrack Pro Development Environment" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Start development databases
Write-Host ""
Write-Host "📦 Starting MongoDB and Redis..." -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml up -d

# Wait for databases to be ready
Write-Host ""
Write-Host "⏳ Waiting for databases to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if MongoDB is ready
$maxRetries = 30
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    try {
        docker exec fintrack-mongodb-dev mongosh --eval "db.runCommand('ping').ok" --quiet | Out-Null
        Write-Host "✅ MongoDB is ready" -ForegroundColor Green
        break
    } catch {
        $retryCount++
        Write-Host "   Waiting for MongoDB... ($retryCount/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

# Check if Redis is ready
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    try {
        $result = docker exec fintrack-redis-dev redis-cli ping 2>&1
        if ($result -eq "PONG") {
            Write-Host "✅ Redis is ready" -ForegroundColor Green
            break
        }
    } catch {
        # Continue waiting
    }
    $retryCount++
    Write-Host "   Waiting for Redis... ($retryCount/$maxRetries)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Development Environment Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database URLs:" -ForegroundColor Yellow
Write-Host "  MongoDB:        mongodb://localhost:27017" -ForegroundColor White
Write-Host "  Redis:          redis://localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Management UIs:" -ForegroundColor Yellow
Write-Host "  Redis Commander: http://localhost:8081" -ForegroundColor White
Write-Host "  Mongo Express:   http://localhost:8082" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Backend:  cd backend && npm run dev" -ForegroundColor White
Write-Host "  2. Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "  3. ML:       cd ml-service && python run.py" -ForegroundColor White
Write-Host ""
Write-Host "To stop: docker-compose -f docker-compose.dev.yml down" -ForegroundColor Gray
