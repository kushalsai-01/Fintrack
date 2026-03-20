"""
Financial Insights Router - AI-powered recommendations
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

import numpy as np

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.config import settings

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
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]

    now = datetime.utcnow()
    current_start = now - timedelta(days=30)
    previous_start = now - timedelta(days=60)

    # Helper: compute totals from a list of transactions.
    def totals_by_type(txns: List[dict]) -> Tuple[float, float]:
        income = 0.0
        expense = 0.0
        for t in txns:
            typ = t.get("type")
            amt = float(t.get("amount", 0.0))
            if typ == "income":
                income += amt
            elif typ == "expense":
                expense += amt
        return income, expense

    try:
        # Fetch transactions for current and previous windows.
        txns_current: List[dict] = []
        txns_previous: List[dict] = []

        cursor_current = db.transactions.find(
            {
                "userId": ObjectId(request.user_id),
                "deletedAt": None,
                "date": {"$gte": current_start, "$lte": now},
            },
            {"type": 1, "amount": 1, "date": 1, "categoryId": 1, "description": 1},
        )
        async for t in cursor_current:
            txns_current.append(t)

        cursor_previous = db.transactions.find(
            {
                "userId": ObjectId(request.user_id),
                "deletedAt": None,
                "date": {"$gte": previous_start, "$lt": current_start},
            },
            {"type": 1, "amount": 1, "date": 1, "categoryId": 1, "description": 1},
        )
        async for t in cursor_previous:
            txns_previous.append(t)

        income_current, expense_current = totals_by_type(txns_current)
        income_previous, expense_previous = totals_by_type(txns_previous)

        # Category totals for current/previous expenses.
        cat_ids = list(
            {t.get("categoryId") for t in txns_current if t.get("type") == "expense" and t.get("categoryId") is not None}
        )
        cat_ids = [cid for cid in cat_ids if cid]

        category_map: Dict[str, str] = {}
        if cat_ids:
            categories_cursor = db.categories.find(
                {"userId": ObjectId(request.user_id), "_id": {"$in": cat_ids}, "isActive": True},
                {"name": 1},
            )
            async for c in categories_cursor:
                category_map[str(c["_id"])] = str(c.get("name") or "Other")

        def expense_by_category(txns: List[dict]) -> Dict[str, float]:
            totals: Dict[str, float] = {}
            for t in txns:
                if t.get("type") != "expense":
                    continue
                cat_id = t.get("categoryId")
                if not cat_id:
                    continue
                key = category_map.get(str(cat_id), "Other")
                totals[key] = totals.get(key, 0.0) + float(t.get("amount", 0.0))
            return totals

        expense_by_cat_current = expense_by_category(txns_current)
        expense_by_cat_previous = expense_by_category(txns_previous)

        # Fetch goals.
        goals: List[dict] = []
        if request.include_goals:
            goals_cursor = db.goals.find(
                {"userId": ObjectId(request.user_id), "status": "active"},
                {"name": 1, "targetAmount": 1, "currentAmount": 1, "targetDate": 1, "priority": 1, "icon": 1},
            )
            async for g in goals_cursor:
                goals.append(g)

        insights: List[Insight] = []

        # Spending insights
        if request.include_spending:
            top_cat = None
            top_increase_pct = 0.0
            for cat, curr_total in expense_by_cat_current.items():
                prev_total = expense_by_cat_previous.get(cat, 0.0)
                if prev_total <= 0:
                    continue
                inc_pct = ((curr_total - prev_total) / prev_total) * 100.0
                if inc_pct > top_increase_pct:
                    top_increase_pct = inc_pct
                    top_cat = cat

            if top_cat and top_increase_pct > 10:
                pot_savings = round(max(0.0, (expense_by_cat_current[top_cat] * top_increase_pct / 100.0)), 2)
                insights.append(
                    Insight(
                        id="spend_1",
                        type="spending",
                        title=f"{top_cat} Spending Up {round(top_increase_pct)}%",
                        description=f"Your spending in {top_cat} increased by about {round(top_increase_pct)}% compared to the previous 30 days. Consider tightening your budget for this category.",
                        impact="negative",
                        priority=5 if top_increase_pct >= 30 else 4,
                        actionable=True,
                        action_text="Review category budget",
                        data={"category": top_cat, "increase_percent": round(top_increase_pct, 1), "potential_savings": pot_savings},
                    )
                )
            else:
                # If no big spikes, add a smaller actionable insight.
                if expense_by_cat_current:
                    most_cat = sorted(expense_by_cat_current.items(), key=lambda x: x[1], reverse=True)[0][0]
                    insights.append(
                        Insight(
                            id="spend_1",
                            type="spending",
                            title=f"Focus on {most_cat}",
                            description=f"{most_cat} is your top spending category over the last 30 days. Small adjustments here can materially improve your cashflow.",
                            impact="neutral",
                            priority=3,
                            actionable=True,
                            action_text="Set a weekly cap",
                            data={"category": most_cat, "top_spend": round(expense_by_cat_current[most_cat], 2)},
                        )
                    )

        # Savings insights
        if request.include_savings:
            if income_current > 0:
                savings = income_current - expense_current
                savings_rate = (savings / income_current) * 100.0
            else:
                savings = 0.0
                savings_rate = 0.0

            is_low = savings_rate < 15
            insights.append(
                Insight(
                    id="save_1",
                    type="savings",
                    title="Savings Rate Check",
                    description=(
                        f"Your savings rate for the last 30 days is about {round(savings_rate, 1)}%. "
                        f"{'Consider reducing discretionary spending to save more.' if is_low else 'Nice work—keep this momentum going.'}"
                    ),
                    impact="negative" if is_low else "positive",
                    priority=4 if is_low else 2,
                    actionable=is_low,
                    action_text="Create a savings plan" if is_low else None,
                    data={"savings_rate": round(savings_rate, 1), "target_rate": 15, "savings_amount": round(savings, 2)},
                )
            )

        # Goal insights
        if request.include_goals and goals:
            # Pick the most critical/high priority first (fallback to earliest target date).
            goals_sorted = sorted(
                goals,
                key=lambda g: (-({"low": 1, "medium": 2, "high": 3}.get(str(g.get("priority")), 2)), g.get("targetDate") or now),
            )
            g = goals_sorted[0]
            name = str(g.get("name") or "Goal")
            target = float(g.get("targetAmount", 0.0))
            current = float(g.get("currentAmount", 0.0))
            progress_pct = 0.0 if target <= 0 else (current / target) * 100.0

            actionable = progress_pct < 45
            impact = "negative" if actionable else "positive"

            insights.append(
                Insight(
                    id="goal_1",
                    type="goal",
                    title=f"{name} is {'behind' if actionable else 'on track'}",
                    description=(
                        f"You’ve completed about {round(progress_pct, 1)}% of your {name} target. "
                        f"{'Consider increasing your monthly contribution to get back on track.' if actionable else 'Your progress looks healthy—keep contributing as planned.'}"
                    ),
                    impact=impact,
                    priority=4 if actionable else 3,
                    actionable=actionable,
                    action_text="Boost monthly contributions" if actionable else None,
                    data={"goal_name": name, "progress_percent": round(progress_pct, 1), "target": target},
                )
            )

        # Prediction insights (simple: forecast next 30 days using last 30 day daily averages)
        if request.include_predictions:
            avg_daily_expense = expense_current / 30.0 if expense_current > 0 else 0.0
            avg_daily_expense_prev = expense_previous / 30.0 if expense_previous > 0 else avg_daily_expense
            if avg_daily_expense_prev > 0:
                growth_pct = ((avg_daily_expense - avg_daily_expense_prev) / avg_daily_expense_prev) * 100.0
            else:
                growth_pct = 0.0

            predicted_next_expense = avg_daily_expense * 30.0
            increase = predicted_next_expense - expense_current

            if increase > 0 and growth_pct > 5:
                insights.append(
                    Insight(
                        id="pred_1",
                        type="prediction",
                        title="Forecast: Expenses May Increase",
                        description=(
                            f"Based on recent trends, your next 30 days expenses are likely to rise by about {round(increase, 2)}. "
                            f"Consider reviewing your top categories and adjusting budgets."
                        ),
                        impact="neutral",
                        priority=4,
                        actionable=True,
                        action_text="Adjust budgets",
                        data={"predicted_increase": round(increase, 2), "growth_percent": round(growth_pct, 1)},
                    )
                )

        # Sort by priority (highest first) and return at most 6 insights.
        insights.sort(key=lambda x: x.priority, reverse=True)
        insights = insights[:6]

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
                "high_priority_count": len([i for i in insights if i.priority >= 4]),
            },
        )
    finally:
        client.close()


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
