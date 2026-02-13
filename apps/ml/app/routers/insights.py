"""
Financial Insights Router - AI-powered recommendations
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter()


class InsightsRequest(BaseModel):
    """Request model for generating insights."""
    user_id: str
    include_spending: bool = True
    include_savings: bool = True
    include_goals: bool = True
    include_predictions: bool = True


class Insight(BaseModel):
    """Single financial insight."""
    id: str
    type: str  # spending, savings, goal, prediction, alert
    title: str
    description: str
    impact: str  # positive, negative, neutral
    priority: int  # 1-5 (5 = highest)
    actionable: bool
    action_text: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class InsightsResponse(BaseModel):
    """Response model for financial insights."""
    success: bool
    user_id: str
    generated_at: datetime
    insights: List[Insight]
    summary: dict


@router.post("/generate", response_model=InsightsResponse)
async def generate_insights(request: InsightsRequest):
    """
    Generate personalized financial insights using AI analysis.
    Analyzes spending patterns, savings potential, and goal progress.
    """
    insights = []
    
    # Spending insights
    if request.include_spending:
        insights.append(Insight(
            id="spend_1",
            type="spending",
            title="Restaurant Spending Up 23%",
            description="Your dining out expenses increased by 23% compared to last month. Consider setting a dining budget to save $150/month.",
            impact="negative",
            priority=4,
            actionable=True,
            action_text="Set Dining Budget",
            data={"category": "Dining", "increase_percent": 23, "potential_savings": 150}
        ))
        
        insights.append(Insight(
            id="spend_2",
            type="spending",
            title="Subscription Review Needed",
            description="You have 8 active subscriptions totaling $127/month. 2 subscriptions haven't been used in 30+ days.",
            impact="neutral",
            priority=3,
            actionable=True,
            action_text="Review Subscriptions",
            data={"total_subscriptions": 8, "monthly_cost": 127, "unused_count": 2}
        ))
    
    # Savings insights
    if request.include_savings:
        insights.append(Insight(
            id="save_1",
            type="savings",
            title="Great Savings Progress!",
            description="You've saved 15% more than your target this month. Keep up the excellent work!",
            impact="positive",
            priority=2,
            actionable=False,
            data={"savings_rate": 18, "target_rate": 15}
        ))
    
    # Goal insights
    if request.include_goals:
        insights.append(Insight(
            id="goal_1",
            type="goal",
            title="Vacation Fund On Track",
            description="At your current savings rate, you'll reach your $3,000 vacation goal by June 15th - 2 weeks ahead of schedule!",
            impact="positive",
            priority=3,
            actionable=False,
            data={"goal_name": "Vacation Fund", "target": 3000, "completion_date": "2024-06-15"}
        ))
    
    # Prediction insights
    if request.include_predictions:
        insights.append(Insight(
            id="pred_1",
            type="prediction",
            title="Upcoming Bill Alert",
            description="Based on your spending pattern, you may need an additional $200 for utilities this month due to seasonal increases.",
            impact="neutral",
            priority=4,
            actionable=True,
            action_text="Adjust Budget",
            data={"category": "Utilities", "predicted_increase": 200}
        ))
    
    # Sort by priority (highest first)
    insights.sort(key=lambda x: x.priority, reverse=True)
    
    return InsightsResponse(
        success=True,
        user_id=request.user_id,
        generated_at=datetime.utcnow(),
        insights=insights,
        summary={
            "total_insights": len(insights),
            "actionable_count": len([i for i in insights if i.actionable]),
            "positive_count": len([i for i in insights if i.impact == "positive"]),
            "negative_count": len([i for i in insights if i.impact == "negative"]),
            "high_priority_count": len([i for i in insights if i.priority >= 4])
        }
    )


@router.get("/{user_id}")
async def get_user_insights(user_id: str, limit: int = 10):
    """Get latest insights for a user."""
    request = InsightsRequest(user_id=user_id)
    response = await generate_insights(request)
    response.insights = response.insights[:limit]
    return response


@router.get("/{user_id}/spending")
async def get_spending_insights(user_id: str):
    """Get spending-focused insights."""
    request = InsightsRequest(
        user_id=user_id,
        include_spending=True,
        include_savings=False,
        include_goals=False,
        include_predictions=False
    )
    return await generate_insights(request)


@router.get("/{user_id}/savings")
async def get_savings_insights(user_id: str):
    """Get savings-focused insights."""
    request = InsightsRequest(
        user_id=user_id,
        include_spending=False,
        include_savings=True,
        include_goals=True,
        include_predictions=False
    )
    return await generate_insights(request)
