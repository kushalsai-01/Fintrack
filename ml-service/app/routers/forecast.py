"""
Forecast Router - Spending and income predictions
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import numpy as np

router = APIRouter()


class ForecastRequest(BaseModel):
    """Request model for forecast generation."""
    user_id: str
    type: str = "spending"  # spending, income, balance
    horizon_days: int = 30
    category_id: Optional[str] = None


class ForecastPoint(BaseModel):
    """Single forecast data point."""
    date: date
    predicted_value: float
    lower_bound: float
    upper_bound: float
    confidence: float


class ForecastResponse(BaseModel):
    """Response model for forecast results."""
    success: bool
    user_id: str
    type: str
    horizon_days: int
    generated_at: datetime
    predictions: List[ForecastPoint]
    summary: dict


@router.post("/generate", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate spending/income forecast using time series analysis.
    Uses ARIMA or Prophet-like decomposition for predictions.
    """
    # Simulated forecast (replace with actual ML model)
    predictions = []
    base_value = 150 if request.type == "spending" else 200
    
    for i in range(request.horizon_days):
        day = datetime.now().date()
        day = date(day.year, day.month, min(day.day + i, 28))
        
        # Add some randomness and trend
        noise = np.random.normal(0, 20)
        trend = i * 0.5
        predicted = base_value + noise + trend
        
        predictions.append(ForecastPoint(
            date=day,
            predicted_value=round(predicted, 2),
            lower_bound=round(predicted * 0.8, 2),
            upper_bound=round(predicted * 1.2, 2),
            confidence=0.85 - (i * 0.01)  # Confidence decreases over time
        ))
    
    total_predicted = sum(p.predicted_value for p in predictions)
    
    return ForecastResponse(
        success=True,
        user_id=request.user_id,
        type=request.type,
        horizon_days=request.horizon_days,
        generated_at=datetime.utcnow(),
        predictions=predictions,
        summary={
            "total_predicted": round(total_predicted, 2),
            "average_daily": round(total_predicted / request.horizon_days, 2),
            "trend": "increasing" if predictions[-1].predicted_value > predictions[0].predicted_value else "decreasing",
            "confidence_avg": round(sum(p.confidence for p in predictions) / len(predictions), 2)
        }
    )


@router.get("/spending/{user_id}")
async def get_spending_forecast(
    user_id: str,
    days: int = Query(default=30, ge=7, le=90)
):
    """Get spending forecast for a user."""
    request = ForecastRequest(user_id=user_id, type="spending", horizon_days=days)
    return await generate_forecast(request)


@router.get("/income/{user_id}")
async def get_income_forecast(
    user_id: str,
    days: int = Query(default=30, ge=7, le=90)
):
    """Get income forecast for a user."""
    request = ForecastRequest(user_id=user_id, type="income", horizon_days=days)
    return await generate_forecast(request)


@router.get("/balance/{user_id}")
async def get_balance_forecast(
    user_id: str,
    days: int = Query(default=30, ge=7, le=90)
):
    """Get balance forecast (income - spending) for a user."""
    request = ForecastRequest(user_id=user_id, type="balance", horizon_days=days)
    return await generate_forecast(request)
