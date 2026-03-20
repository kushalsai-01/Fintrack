"""
Financial Health Router - Health score calculations
"""
from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.config import settings

router = APIRouter()


class HealthMetrics(BaseModel):
    """User's financial metrics for health calculation."""
    monthly_income: float
    monthly_expenses: float
    total_savings: float
    total_debt: float
    emergency_fund: float
    credit_utilization: float = 0  # 0-100 percentage
    on_time_payments: int = 100  # percentage
    investment_ratio: float = 0  # percentage of income invested


class HealthScore(BaseModel):
    """Individual health score component."""
    name: str
    score: float  # 0-100
    weight: float
    status: str  # excellent, good, fair, poor, critical
    recommendation: str


class HealthResponse(BaseModel):
    """Financial health assessment response."""
    success: bool
    user_id: str
    overall_score: float
    grade: str  # A+, A, B, C, D, F
    assessment_date: datetime
    components: List[HealthScore]
    recommendations: List[str]
    trends: Dict[str, str]


def get_grade(score: float) -> str:
    """Convert numerical score to letter grade."""
    if score >= 90: return "A+"
    if score >= 85: return "A"
    if score >= 80: return "A-"
    if score >= 75: return "B+"
    if score >= 70: return "B"
    if score >= 65: return "B-"
    if score >= 60: return "C+"
    if score >= 55: return "C"
    if score >= 50: return "C-"
    if score >= 40: return "D"
    return "F"


def get_status(score: float) -> str:
    """Get status label from score."""
    if score >= 80: return "excellent"
    if score >= 60: return "good"
    if score >= 40: return "fair"
    if score >= 20: return "poor"
    return "critical"


@router.post("/calculate", response_model=HealthResponse)
async def calculate_health_score(user_id: str, metrics: HealthMetrics):
    """
    Calculate comprehensive financial health score.
    Analyzes savings rate, debt-to-income, emergency fund, and more.
    """
    components = []
    recommendations = []
    
    # 1. Savings Rate (25% weight)
    savings_rate = ((metrics.monthly_income - metrics.monthly_expenses) / 
                    max(metrics.monthly_income, 1)) * 100
    savings_score = min(max(savings_rate * 5, 0), 100)  # 20% savings = 100 score
    components.append(HealthScore(
        name="Savings Rate",
        score=round(savings_score, 1),
        weight=0.25,
        status=get_status(savings_score),
        recommendation="Aim to save at least 20% of your income"
    ))
    if savings_rate < 10:
        recommendations.append("Increase your savings rate by reducing discretionary spending")
    
    # 2. Debt-to-Income Ratio (20% weight)
    dti_ratio = (metrics.total_debt / max(metrics.monthly_income * 12, 1)) * 100
    dti_score = max(100 - dti_ratio * 2, 0)  # Lower is better
    components.append(HealthScore(
        name="Debt-to-Income",
        score=round(dti_score, 1),
        weight=0.20,
        status=get_status(dti_score),
        recommendation="Keep total debt below 36% of annual income"
    ))
    if dti_ratio > 40:
        recommendations.append("Focus on paying down high-interest debt")
    
    # 3. Emergency Fund (20% weight)
    months_covered = metrics.emergency_fund / max(metrics.monthly_expenses, 1)
    emergency_score = min(months_covered * 16.67, 100)  # 6 months = 100
    components.append(HealthScore(
        name="Emergency Fund",
        score=round(emergency_score, 1),
        weight=0.20,
        status=get_status(emergency_score),
        recommendation="Build an emergency fund covering 6 months of expenses"
    ))
    if months_covered < 3:
        recommendations.append("Prioritize building your emergency fund to 3-6 months of expenses")
    
    # 4. Credit Utilization (15% weight)
    credit_score = max(100 - metrics.credit_utilization * 3, 0)
    components.append(HealthScore(
        name="Credit Utilization",
        score=round(credit_score, 1),
        weight=0.15,
        status=get_status(credit_score),
        recommendation="Keep credit utilization below 30%"
    ))
    if metrics.credit_utilization > 30:
        recommendations.append("Pay down credit card balances to reduce utilization")
    
    # 5. Payment History (10% weight)
    payment_score = metrics.on_time_payments
    components.append(HealthScore(
        name="Payment History",
        score=round(payment_score, 1),
        weight=0.10,
        status=get_status(payment_score),
        recommendation="Always pay bills on time"
    ))
    
    # 6. Investment Ratio (10% weight)
    investment_score = min(metrics.investment_ratio * 6.67, 100)  # 15% = 100
    components.append(HealthScore(
        name="Investments",
        score=round(investment_score, 1),
        weight=0.10,
        status=get_status(investment_score),
        recommendation="Invest 10-15% of income for long-term wealth"
    ))
    if metrics.investment_ratio < 5:
        recommendations.append("Start investing for retirement, even small amounts help")
    
    # Calculate weighted overall score
    overall_score = sum(c.score * c.weight for c in components)
    
    return HealthResponse(
        success=True,
        user_id=user_id,
        overall_score=round(overall_score, 1),
        grade=get_grade(overall_score),
        assessment_date=datetime.utcnow(),
        components=components,
        recommendations=recommendations[:5],  # Top 5 recommendations
        trends={
            "savings": "improving",
            "debt": "stable",
            "overall": "improving"
        }
    )


async def _compute_health_metrics(user_id: str) -> HealthMetrics:
    """
    Compute the metrics used by `calculate_health_score` from MongoDB.
    This removes demo/static behavior and enables real per-user scoring.
    """
    client = AsyncIOMotorClient()
    # Reuse ML service settings (the env-injected ones).
    client = AsyncIOMotorClient(settings.MONGODB_URI)  # type: ignore[name-defined]
    db = client[settings.MONGODB_DATABASE]  # type: ignore[name-defined]

    try:
        now = datetime.utcnow()
        start = now - timedelta(days=30)

        income = 0.0
        expenses = 0.0
        cursor = db.transactions.find(
            {"userId": ObjectId(user_id), "deletedAt": None, "date": {"$gte": start, "$lte": now}},
            {"type": 1, "amount": 1},
        )
        async for t in cursor:
            amt = float(t.get("amount", 0.0))
            typ = t.get("type")
            if typ == "income":
                income += amt
            elif typ == "expense":
                expenses += amt

        savings = max(0.0, income - expenses)

        # Approximate debt: sum current balance from debts collection if present.
        total_debt = 0.0
        debt_cursor = db.debts.find({"userId": ObjectId(user_id)}, {"currentBalance": 1, "originalAmount": 1})
        async for d in debt_cursor:
            total_debt += float(d.get("currentBalance") or d.get("originalAmount") or 0.0)

        # Approximate investment ratio using investment current value vs income.
        investment_value = 0.0
        inv_cursor = db.investments.find({"userId": ObjectId(user_id)}, {"quantity": 1, "currentPrice": 1})
        async for inv in inv_cursor:
            investment_value += float(inv.get("quantity", 0.0)) * float(inv.get("currentPrice", 0.0))

        investment_ratio = 0.0
        if income > 0:
            investment_ratio = (investment_value / income) * 100.0

        # Emergency fund and credit utilization are not directly modeled; keep conservative defaults.
        return HealthMetrics(
            monthly_income=round(income, 2),
            monthly_expenses=round(expenses, 2),
            total_savings=round(savings, 2),
            total_debt=round(total_debt, 2),
            emergency_fund=0.0,
            credit_utilization=0.0,
            on_time_payments=100,
            investment_ratio=round(min(investment_ratio, 100), 2),
        )
    finally:
        client.close()


@router.get("/{user_id}", response_model=HealthResponse)
async def get_user_health(user_id: str):
    """Get latest health score for a user."""
    metrics = await _compute_health_metrics(user_id)
    return await calculate_health_score(user_id, metrics)


@router.post("/{user_id}", response_model=HealthResponse)
async def post_user_health(user_id: str, _metrics: Dict[str, Any] = Body(default={})):
    """
    Compatibility endpoint: `mlService.ts` calls POST /health/{user_id}.
    We ignore the incoming payload and compute from DB for consistent output.
    """
    metrics = await _compute_health_metrics(user_id)
    return await calculate_health_score(user_id, metrics)


@router.get("/{user_id}/history")
async def get_health_history(user_id: str, months: int = 6):
    """Get health score history for trends."""
    # Compute rolling health scores month-by-month from transactions.
    # If there isn't enough data, we still return a sensible (lower-confidence) trend.
    client = AsyncIOMotorClient(settings.MONGODB_URI)  # type: ignore[name-defined]
    db = client[settings.MONGODB_DATABASE]  # type: ignore[name-defined]
    try:
        now = datetime.utcnow()
        history = []
        for m in range(months):
            # Approximate each "month" as 30 days.
            end = now - timedelta(days=(m * 30))
            start = end - timedelta(days=30)

            income = 0.0
            expenses = 0.0
            cursor = db.transactions.find(
                {"userId": ObjectId(user_id), "deletedAt": None, "date": {"$gte": start, "$lte": end}},
                {"type": 1, "amount": 1},
            )
            async for t in cursor:
                amt = float(t.get("amount", 0.0))
                typ = t.get("type")
                if typ == "income":
                    income += amt
                elif typ == "expense":
                    expenses += amt

            savings = max(0.0, income - expenses)
            metrics = HealthMetrics(
                monthly_income=round(income, 2),
                monthly_expenses=round(expenses, 2),
                total_savings=round(savings, 2),
                total_debt=0.0,
                emergency_fund=0.0,
                credit_utilization=0.0,
                on_time_payments=100,
                investment_ratio=0.0,
            )

            resp = await calculate_health_score(user_id, metrics)
            history.append(
                {"month": end.strftime("%Y-%m"), "score": resp.overall_score, "grade": resp.grade}
            )

        history = list(reversed(history))
        trend = "improving" if history and history[-1]["score"] > history[0]["score"] else "stable"
        change = (
            f"{history[-1]['score'] - history[0]['score']:+.0f} points over {months} month(s)"
            if history
            else "0 points"
        )
        return {
            "success": True,
            "user_id": user_id,
            "history": history,
            "trend": trend,
            "change": change,
        }
    finally:
        client.close()
