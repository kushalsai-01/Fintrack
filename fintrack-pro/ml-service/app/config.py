"""
FinTrack Pro ML Service Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "FinTrack Pro ML Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "fintrack-pro"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Backend API
    BACKEND_URL: str = "http://localhost:5000"
    
    # ML Model Settings
    FORECAST_HORIZON_DAYS: int = 30
    ANOMALY_CONTAMINATION: float = 0.1
    MIN_DATA_POINTS: int = 10
    
    # Cache TTL (seconds)
    CACHE_TTL: int = 3600
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
