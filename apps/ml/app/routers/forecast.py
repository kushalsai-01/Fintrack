"""
Forecast Router - Spending and income predictions
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import numpy as np
from pathlib import Path
import math

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from sklearn.linear_model import LinearRegression

from app.config import settings

router = APIRouter()


class ForecastRequest(BaseModel):
    """Request model for forecast generation."""
    user_id: str
    type: str = "spending"  # spending, income, balance
    horizon_days: int = 30
    category_id: Optional[str] = None


class ForecastPoint(BaseModel):
    """Single forecast data point (matches frontend `ForecastPrediction`)."""
    date: date
    predictedBalance: float
    predictedIncome: float
    predictedExpense: float
    confidenceLower: float
    confidenceUpper: float
    confidence: float


class ForecastResponse(BaseModel):
    """Response model for forecast results."""
    success: bool
    user_id: str
    type: str
    horizon_days: int
    generated_at: datetime
    predictions: List[ForecastPoint]
    summary: Dict[str, Any]


@router.post("/generate", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate spending/income forecast using time series analysis.
    Uses ARIMA or Prophet-like decomposition for predictions.
    """
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    try:
        # Build daily series from last 90 days.
        now = datetime.utcnow()
        since_dt = now - timedelta(days=90)

        start_day = since_dt.date()
        end_day = now.date()
        total_days = (end_day - start_day).days + 1

        # Init arrays
        daily_income = np.zeros(total_days, dtype=float)
        daily_expense = np.zeros(total_days, dtype=float)

        cursor = db.transactions.find(
            {
                "userId": ObjectId(request.user_id),
                "deletedAt": None,
                "date": {"$gte": since_dt},
            },
            {"amount": 1, "type": 1, "date": 1},
        )

        async for t in cursor:
            dt = t.get("date")
            if not dt:
                continue
            d = dt.date()
            idx = (d - start_day).days
            if idx < 0 or idx >= total_days:
                continue
            amount = float(t.get("amount", 0.0))
            typ = t.get("type")
            if typ == "income":
                daily_income[idx] += amount
            elif typ == "expense":
                daily_expense[idx] += amount

        # Fit linear regression for each series.
        X = np.arange(total_days, dtype=float).reshape(-1, 1)

        def fit_and_forecast(series: np.ndarray):
            y = series.astype(float)
            # Handle constant/empty series.
            if np.allclose(y, 0):
                return np.zeros(request.horizon_days, dtype=float), 0.0

            model = LinearRegression()
            model.fit(X, y)
            preds = model.predict(np.arange(total_days, total_days + request.horizon_days).reshape(-1, 1))

            # Residual std for confidence bounds.
            in_preds = model.predict(X)
            residuals = y - in_preds
            res_std = float(np.std(residuals)) if residuals.size > 1 else 0.0
            return preds, res_std

        income_preds, income_std = fit_and_forecast(daily_income)
        expense_preds, expense_std = fit_and_forecast(daily_expense)

        # Confidence based on residuals (higher std => lower confidence).
        res_std = max(income_std, expense_std)

        predictions: List[ForecastPoint] = []
        min_balance = math.inf
        min_balance_date: Optional[date] = None
        total_income = 0.0
        total_expense = 0.0

        for i in range(request.horizon_days):
            d = date.fromordinal(end_day.toordinal() + i)

            pred_income = float(max(0.0, income_preds[i]))
            pred_expense = float(max(0.0, expense_preds[i]))
            pred_balance = pred_income - pred_expense

            # Confidence bounds for balance.
            # Use combined std and clamp bounds to reasonable values.
            margin = 1.5 * res_std + 0.01 * abs(pred_balance)
            lower = pred_balance - margin
            upper = pred_balance + margin

            # Confidence heuristic: tighter margin => higher confidence.
            denom = abs(pred_balance) + 100.0
            confidence = 1.0 - min(0.95, margin / denom)
            confidence = max(0.2, min(0.95, confidence))
            # Slightly decay confidence with horizon.
            confidence = max(0.2, confidence - (i / max(request.horizon_days, 1)) * 0.1)

            predictions.append(
                ForecastPoint(
                    date=d,
                    predictedBalance=round(pred_balance, 2),
                    predictedIncome=round(pred_income, 2),
                    predictedExpense=round(pred_expense, 2),
                    confidenceLower=round(lower, 2),
                    confidenceUpper=round(upper, 2),
                    confidence=round(confidence, 3),
                )
            )

            total_income += pred_income
            total_expense += pred_expense
            if pred_balance < min_balance:
                min_balance = pred_balance
                min_balance_date = d

        start_balance = float(np.sum(daily_income) - np.sum(daily_expense))
        end_balance = start_balance + (total_income - total_expense)

        return ForecastResponse(
            success=True,
            user_id=request.user_id,
            type=request.type,
            horizon_days=request.horizon_days,
            generated_at=datetime.utcnow(),
            predictions=predictions,
            summary={
                "startBalance": round(start_balance, 2),
                "endBalance": round(end_balance, 2),
                "totalIncome": round(total_income, 2),
                "totalExpense": round(total_expense, 2),
                "netChange": round(total_income - total_expense, 2),
                "averageDaily": round((total_income - total_expense) / max(request.horizon_days, 1), 2),
                "minBalance": round(min_balance if min_balance != math.inf else 0.0, 2),
                "minBalanceDate": min_balance_date.isoformat() if min_balance_date else None,
            },
        )
    finally:
        client.close()


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


@router.post("/balance")
async def get_balance_forecast(request: ForecastRequest):
    """Get balance forecast (income - expenses)."""
    request.type = "balance"
    return await generate_forecast(request)


@router.get("/balance/{user_id}")
async def get_balance_forecast(
    user_id: str,
    days: int = Query(default=30, ge=7, le=90)
):
    """Get balance forecast (income - spending) for a user."""
    request = ForecastRequest(user_id=user_id, type="balance", horizon_days=days)
    return await generate_forecast(request)
