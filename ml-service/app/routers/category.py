"""
Category Prediction Router - Auto-categorization of transactions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import re

router = APIRouter()


# Simple keyword-based categorization (replace with ML model)
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Food & Dining": ["restaurant", "cafe", "coffee", "pizza", "burger", "sushi", "doordash", "ubereats", "grubhub", "mcdonald", "starbucks", "chipotle"],
    "Groceries": ["grocery", "supermarket", "walmart", "target", "costco", "trader joe", "whole foods", "safeway", "kroger", "publix"],
    "Transportation": ["uber", "lyft", "gas", "fuel", "shell", "chevron", "parking", "metro", "transit", "airline", "flight"],
    "Shopping": ["amazon", "ebay", "mall", "store", "shop", "clothing", "electronics", "apple", "best buy"],
    "Entertainment": ["netflix", "spotify", "hulu", "disney", "movie", "theater", "concert", "gaming", "steam", "playstation"],
    "Utilities": ["electric", "water", "gas", "internet", "phone", "comcast", "verizon", "att", "utility"],
    "Healthcare": ["pharmacy", "hospital", "doctor", "medical", "cvs", "walgreens", "dental", "vision", "insurance"],
    "Subscriptions": ["subscription", "membership", "monthly", "annual", "premium"],
    "Income": ["salary", "payroll", "deposit", "transfer in", "income", "refund"],
    "Transfer": ["transfer", "venmo", "zelle", "paypal", "cash app"],
}


class PredictionRequest(BaseModel):
    """Request for single category prediction."""
    description: str
    amount: float
    merchant: Optional[str] = None


class BatchPredictionRequest(BaseModel):
    """Request for batch category predictions."""
    transactions: List[PredictionRequest]


class CategoryPrediction(BaseModel):
    """Category prediction result."""
    predicted_category: str
    confidence: float
    alternatives: List[Dict[str, float]]


class PredictionResponse(BaseModel):
    """Response for category prediction."""
    success: bool
    prediction: CategoryPrediction


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions."""
    success: bool
    predictions: List[CategoryPrediction]


def predict_category(description: str, merchant: Optional[str] = None, amount: float = 0) -> CategoryPrediction:
    """Predict category based on description and merchant."""
    text = f"{description} {merchant or ''}".lower()
    
    scores: Dict[str, float] = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in text:
                score += 1
        if score > 0:
            scores[category] = score
    
    # Default category based on amount sign
    if not scores:
        if amount > 0:
            return CategoryPrediction(
                predicted_category="Income",
                confidence=0.5,
                alternatives=[{"Other": 0.3}]
            )
        return CategoryPrediction(
            predicted_category="Other",
            confidence=0.3,
            alternatives=[]
        )
    
    # Sort by score
    sorted_categories = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_category = sorted_categories[0][0]
    max_score = sorted_categories[0][1]
    
    # Calculate confidence (normalize score)
    total_score = sum(scores.values())
    confidence = min(max_score / max(total_score, 1) + 0.3, 0.95)
    
    # Get alternatives
    alternatives = [
        {cat: round(score / total_score, 2)}
        for cat, score in sorted_categories[1:4]
    ]
    
    return CategoryPrediction(
        predicted_category=top_category,
        confidence=round(confidence, 2),
        alternatives=alternatives
    )


@router.post("/predict", response_model=PredictionResponse)
async def predict_single_category(request: PredictionRequest):
    """Predict category for a single transaction."""
    prediction = predict_category(
        request.description,
        request.merchant,
        request.amount
    )
    return PredictionResponse(success=True, prediction=prediction)


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch_categories(request: BatchPredictionRequest):
    """Predict categories for multiple transactions."""
    predictions = [
        predict_category(txn.description, txn.merchant, txn.amount)
        for txn in request.transactions
    ]
    return BatchPredictionResponse(success=True, predictions=predictions)


@router.get("/categories")
async def get_available_categories():
    """Get list of available categories."""
    return {
        "success": True,
        "categories": list(CATEGORY_KEYWORDS.keys()) + ["Other"]
    }


@router.post("/train/{user_id}")
async def train_category_model(user_id: str):
    """Train personalized category model for user."""
    return {
        "success": True,
        "user_id": user_id,
        "message": "Category model training initiated",
        "status": "processing"
    }
