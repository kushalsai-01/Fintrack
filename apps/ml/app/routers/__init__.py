"""
FinTrack ML Service - Routers Package
"""
from app.routers import forecast, anomaly, insights, category, health, goals, ocr, health_check

__all__ = ["forecast", "anomaly", "insights", "category", "health", "goals", "ocr", "health_check"]
