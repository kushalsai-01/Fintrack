# PowerShell script to start production environment
# Usage: .\start-prod.ps1

Write-Host "🚀 Starting FinTrack Pro Production Environment" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check for .env file
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  No backend/.env file found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "   Please update backend/.env with your production values" -ForegroundColor Yellow
}

# Build and start all services
Write-Host ""
Write-Host "🏗️  Building Docker images..." -ForegroundColor Cyan
docker-compose build

Write-Host ""
Write-Host "📦 Starting all services..." -ForegroundColor Cyan
docker-compose up -d

# Wait for services to be ready
Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Health checks
Write-Host ""
Write-Host "🔍 Checking service health..." -ForegroundColor Cyan

# Check Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend API is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⏳ Backend API is starting up..." -ForegroundColor Yellow
}

# Check Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⏳ Frontend is starting up..." -ForegroundColor Yellow
}

# Check ML Service
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/healthz" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ ML Service is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⏳ ML Service is starting up..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 FinTrack Pro Production Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:  http://localhost:5000/api" -ForegroundColor White
Write-Host "  ML Service:   http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  View logs:    docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop:         docker-compose down" -ForegroundColor White
Write-Host "  Restart:      docker-compose restart" -ForegroundColor White
