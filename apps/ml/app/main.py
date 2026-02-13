"""
FinTrack ML Service - Main Application
FastAPI application for financial predictions, anomaly detection, and insights.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import forecast, anomaly, insights, category, goals, ocr, health as financial_health
from app.routers import health_check


# Configure logging with file rotation
log_dir = Path("/app/logs")
log_dir.mkdir(parents=True, exist_ok=True)

log_level = logging.DEBUG if settings.DEBUG else logging.INFO
log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Create formatters
formatter = logging.Formatter(log_format)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(log_level)
console_handler.setFormatter(formatter)

# File handler for all logs (rotating, max 10MB, keep 5 files)
file_handler = RotatingFileHandler(
    log_dir / "ml-service.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5
)
file_handler.setLevel(log_level)
file_handler.setFormatter(formatter)

# Error-only file handler
error_handler = RotatingFileHandler(
    log_dir / "ml-service-error.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5
)
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)

# Configure root logger
logging.basicConfig(
    level=log_level,
    format=log_format,
    handlers=[console_handler, file_handler, error_handler]
)

logger = logging.getLogger(__name__)
logger.info(f"📂 Logging to {log_dir}")

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📊 MongoDB: {settings.MONGODB_URI}")
    logger.info(f"🔴 Redis: {settings.REDIS_URL}")
    
    # Check and train ML models if missing
    logger.info("🔍 Checking ML models...")
    try:
        import os
        from pathlib import Path
        
        model_dir = Path(os.getenv("MODEL_DIR", "/app/models"))
        model_dir.mkdir(parents=True, exist_ok=True)
        
        required_models = ['category_model.pkl', 'anomaly_model.pkl', 'forecast_config.pkl']
        missing_models = [m for m in required_models if not (model_dir / m).exists()]
        
        if missing_models:
            logger.warning(f"⚠️  Missing models: {missing_models}")
            logger.info("🔧 Training models on first startup...")
            
            try:
                import subprocess
                result = subprocess.run(
                    ["python", "scripts/train_models.py"],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    logger.info("✅ Models trained successfully")
                else:
                    logger.warning(f"⚠️  Model training had issues: {result.stderr}")
            except Exception as e:
                logger.warning(f"⚠️  Could not auto-train models: {e}")
                logger.info("   Run manually: python scripts/train_models.py")
        else:
            logger.info(f"✅ All models found in {model_dir}")
    except Exception as e:
        logger.warning(f"⚠️  Model check failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down ML Service...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Financial analytics and predictions for FinTrack",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


# Include routers
app.include_router(forecast.router, prefix="/forecast", tags=["Forecasting"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["Anomaly Detection"])
app.include_router(insights.router, prefix="/insights", tags=["Financial Insights"])
app.include_router(category.router, prefix="/category", tags=["Category Prediction"])
app.include_router(financial_health.router, prefix="/financial-health", tags=["Financial Health"])
app.include_router(goals.router, prefix="/goals", tags=["Goal Analysis"])
app.include_router(ocr.router, prefix="/ocr", tags=["Receipt OCR"])
app.include_router(health_check.router, prefix="/health", tags=["Health Check"])


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "forecast": "/forecast",
            "anomaly": "/anomaly",
            "insights": "/insights",
            "category": "/category",
            "goals": "/goals",
            "ocr": "/ocr"
        }
    }


# Health check endpoint
@app.get("/healthz")
async def health_check():
    """Health check endpoint for Docker/Kubernetes."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }


# Ready check endpoint
@app.get("/readyz")
async def ready_check():
    """Readiness check endpoint."""
    # Add checks for dependencies (MongoDB, Redis) here
    return {
        "status": "ready",
        "checks": {
            "ml_models": "loaded",
            "database": "connected",
            "cache": "connected"
        }
    }
