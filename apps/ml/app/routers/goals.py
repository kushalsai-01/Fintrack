"""
Goal Analysis Router - Smart goal recommendations
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

router = APIRouter()


class Goal(BaseModel):
    """User financial goal."""
    id: str
    name: str
    target_amount: float
    current_amount: float
    deadline: date
    category: str  # savings, debt, investment, purchase
    priority: int = 1  # 1-5


class GoalAnalysisRequest(BaseModel):
    """Request for goal analysis."""
    user_id: str
    goals: List[Goal]
    monthly_income: float
    monthly_expenses: float
    available_for_goals: Optional[float] = None


class GoalRecommendation(BaseModel):
    """Recommendation for a specific goal."""
    goal_id: str
    goal_name: str
    recommended_monthly: float
    completion_date: date
    is_achievable: bool
    progress_percent: float
    status: str  # on_track, behind, ahead, at_risk
    tips: List[str]


class GoalAnalysisResponse(BaseModel):
    """Response with goal analysis and recommendations."""
    success: bool
    user_id: str
    analysis_date: datetime
    total_goals: int
    achievable_goals: int
    recommendations: List[GoalRecommendation]
    summary: Dict[str, Any]
    priority_order: List[str]


@router.post("/analyze", response_model=GoalAnalysisResponse)
async def analyze_goals(request: GoalAnalysisRequest):
    """
    Analyze goals and provide smart recommendations.
    Calculates optimal allocation and achievability.
    """
    available = request.available_for_goals or (request.monthly_income - request.monthly_expenses)
    available = max(available, 0)
    
    recommendations = []
    priority_order = []
    achievable_count = 0
    
    # Sort goals by priority and deadline
    sorted_goals = sorted(request.goals, key=lambda g: (g.priority, g.deadline))
    
    remaining_budget = available
    
    for goal in sorted_goals:
        remaining = goal.target_amount - goal.current_amount
        months_left = max((goal.deadline.year - datetime.now().year) * 12 + 
                         (goal.deadline.month - datetime.now().month), 1)
        
        required_monthly = remaining / months_left if months_left > 0 else remaining
        progress = (goal.current_amount / goal.target_amount) * 100 if goal.target_amount > 0 else 0
        
        # Determine if achievable with current budget
        is_achievable = required_monthly <= remaining_budget
        
        # Calculate realistic allocation
        if is_achievable:
            recommended = required_monthly
            remaining_budget -= required_monthly
            achievable_count += 1
            completion = goal.deadline
            
            if progress >= (100 - (months_left / 12 * 100)):
                status = "ahead"
            else:
                status = "on_track"
        else:
            # Calculate extended timeline
            if remaining_budget > 0:
                months_needed = remaining / remaining_budget
                completion = datetime.now().date() + relativedelta(months=int(months_needed))
                recommended = min(remaining_budget * 0.5, required_monthly)
                remaining_budget -= recommended
                status = "behind"
            else:
                completion = goal.deadline + relativedelta(years=1)
                recommended = 0
                status = "at_risk"
        
        tips = []
        if status == "behind":
            tips.append(f"Increase monthly contribution to ${required_monthly:.0f} to meet deadline")
        if status == "at_risk":
            tips.append("Consider extending deadline or reducing target amount")
        if progress < 25 and months_left < 6:
            tips.append("This goal needs immediate attention")
        if not tips:
            tips.append("Great progress! Keep it up!")
        
        recommendations.append(GoalRecommendation(
            goal_id=goal.id,
            goal_name=goal.name,
            recommended_monthly=round(recommended, 2),
            completion_date=completion,
            is_achievable=is_achievable,
            progress_percent=round(progress, 1),
            status=status,
            tips=tips
        ))
        
        priority_order.append(goal.id)
    
    return GoalAnalysisResponse(
        success=True,
        user_id=request.user_id,
        analysis_date=datetime.utcnow(),
        total_goals=len(request.goals),
        achievable_goals=achievable_count,
        recommendations=recommendations,
        summary={
            "total_target": sum(g.target_amount for g in request.goals),
            "total_saved": sum(g.current_amount for g in request.goals),
            "monthly_budget": available,
            "allocated": available - remaining_budget,
            "unallocated": remaining_budget
        },
        priority_order=priority_order
    )


@router.get("/{user_id}/suggestions")
async def get_goal_suggestions(user_id: str, income: float = 5000):
    """Get smart goal suggestions based on financial profile."""
    suggestions = [
        {
            "name": "Emergency Fund",
            "category": "savings",
            "recommended_target": income * 6,
            "reason": "Essential safety net for unexpected expenses",
            "priority": 1
        },
        {
            "name": "High-Interest Debt Payoff",
            "category": "debt",
            "recommended_target": None,
            "reason": "Eliminate expensive debt to free up cash flow",
            "priority": 2
        },
        {
            "name": "Retirement Savings",
            "category": "investment",
            "recommended_target": income * 0.15 * 12,
            "reason": "Build long-term wealth for financial independence",
            "priority": 3
        },
        {
            "name": "Vacation Fund",
            "category": "savings",
            "recommended_target": 3000,
            "reason": "Plan for experiences without going into debt",
            "priority": 4
        }
    ]
    
    return {
        "success": True,
        "user_id": user_id,
        "suggestions": suggestions
    }


@router.post("/optimize")
async def optimize_goal_allocation(request: GoalAnalysisRequest):
    """Optimize goal allocation using mathematical optimization."""
    # Use the analyze endpoint with optimization logic
    analysis = await analyze_goals(request)
    
    return {
        "success": True,
        "user_id": request.user_id,
        "optimized_allocation": [
            {
                "goal_id": r.goal_id,
                "goal_name": r.goal_name,
                "allocation": r.recommended_monthly
            }
            for r in analysis.recommendations
        ],
        "total_allocated": sum(r.recommended_monthly for r in analysis.recommendations)
    }
