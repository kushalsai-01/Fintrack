"""
FinTrack Pro ML Service - Main Application
FastAPI application for financial predictions, anomaly detection, and insights.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.config import settings
from app.routers import forecast, anomaly, insights, category, health, goals, ocr


# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📊 MongoDB: {settings.MONGODB_URI}")
    logger.info(f"🔴 Redis: {settings.REDIS_URL}")
    
    # Initialize ML models (lazy loading)
    yield
    
    # Shutdown
    logger.info("👋 Shutting down ML Service...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered financial analytics and predictions for FinTrack Pro",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

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
app.include_router(health.router, prefix="/health", tags=["Financial Health"])
app.include_router(goals.router, prefix="/goals", tags=["Goal Analysis"])
app.include_router(ocr.router, prefix="/ocr", tags=["Receipt OCR"])


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
