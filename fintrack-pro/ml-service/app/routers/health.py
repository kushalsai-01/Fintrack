"""
Financial Health Router - Health score calculations
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

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


@router.get("/{user_id}")
async def get_user_health(user_id: str):
    """Get latest health score for a user."""
    # In production, fetch from database
    # Using sample data for demo
    sample_metrics = HealthMetrics(
        monthly_income=5000,
        monthly_expenses=3500,
        total_savings=15000,
        total_debt=8000,
        emergency_fund=10000,
        credit_utilization=25,
        on_time_payments=98,
        investment_ratio=10
    )
    return await calculate_health_score(user_id, sample_metrics)


@router.get("/{user_id}/history")
async def get_health_history(user_id: str, months: int = 6):
    """Get health score history for trends."""
    # Sample historical data
    history = []
    base_score = 72
    for i in range(months):
        history.append({
            "month": f"2024-{12-i:02d}",
            "score": base_score + i * 1.5,
            "grade": get_grade(base_score + i * 1.5)
        })
    
    return {
        "success": True,
        "user_id": user_id,
        "history": list(reversed(history)),
        "trend": "improving",
        "change": "+9 points over 6 months"
    }
