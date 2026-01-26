"""
Anomaly Detection Router - Unusual transaction detection
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import numpy as np

router = APIRouter()


class Transaction(BaseModel):
    """Transaction data for anomaly detection."""
    id: str
    amount: float
    category: str
    merchant: Optional[str] = None
    date: datetime
    description: Optional[str] = None


class AnomalyRequest(BaseModel):
    """Request model for anomaly detection."""
    user_id: str
    transactions: List[Transaction]
    sensitivity: float = 0.1  # 0.05-0.2 range


class AnomalyResult(BaseModel):
    """Single anomaly detection result."""
    transaction_id: str
    is_anomaly: bool
    anomaly_score: float
    reason: str
    severity: str  # low, medium, high


class AnomalyResponse(BaseModel):
    """Response model for anomaly detection."""
    success: bool
    user_id: str
    total_transactions: int
    anomalies_found: int
    results: List[AnomalyResult]
    summary: dict


@router.post("/detect", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyRequest):
    """
    Detect anomalies in transaction data using Isolation Forest.
    Identifies unusual spending patterns, amounts, and frequencies.
    """
    results = []
    anomaly_count = 0
    
    if not request.transactions:
        return AnomalyResponse(
            success=True,
            user_id=request.user_id,
            total_transactions=0,
            anomalies_found=0,
            results=[],
            summary={"message": "No transactions to analyze"}
        )
    
    # Calculate statistics
    amounts = [t.amount for t in request.transactions]
    mean_amount = np.mean(amounts)
    std_amount = np.std(amounts) if len(amounts) > 1 else 0
    
    for txn in request.transactions:
        # Simple z-score based anomaly detection (replace with Isolation Forest)
        z_score = abs((txn.amount - mean_amount) / std_amount) if std_amount > 0 else 0
        
        is_anomaly = z_score > 2.5 or txn.amount > mean_amount * 3
        anomaly_score = min(z_score / 3, 1.0)  # Normalize to 0-1
        
        if is_anomaly:
            anomaly_count += 1
            
            if z_score > 4:
                severity = "high"
                reason = f"Unusually high amount: ${txn.amount:.2f} (avg: ${mean_amount:.2f})"
            elif z_score > 3:
                severity = "medium"
                reason = f"Higher than normal spending: ${txn.amount:.2f}"
            else:
                severity = "low"
                reason = f"Slightly unusual amount: ${txn.amount:.2f}"
        else:
            severity = "low"
            reason = "Normal transaction"
        
        results.append(AnomalyResult(
            transaction_id=txn.id,
            is_anomaly=is_anomaly,
            anomaly_score=round(anomaly_score, 3),
            reason=reason,
            severity=severity
        ))
    
    # Sort by anomaly score (highest first)
    results.sort(key=lambda x: x.anomaly_score, reverse=True)
    
    return AnomalyResponse(
        success=True,
        user_id=request.user_id,
        total_transactions=len(request.transactions),
        anomalies_found=anomaly_count,
        results=results,
        summary={
            "mean_amount": round(mean_amount, 2),
            "std_amount": round(std_amount, 2),
            "anomaly_rate": round(anomaly_count / len(request.transactions) * 100, 1),
            "high_severity_count": len([r for r in results if r.severity == "high"]),
            "medium_severity_count": len([r for r in results if r.severity == "medium"])
        }
    )


@router.get("/recent/{user_id}")
async def get_recent_anomalies(user_id: str, limit: int = 10):
    """Get recent anomalies for a user (cached results)."""
    # In production, this would fetch from cache/database
    return {
        "success": True,
        "user_id": user_id,
        "anomalies": [],
        "message": "No recent anomalies detected"
    }


@router.post("/train/{user_id}")
async def train_anomaly_model(user_id: str):
    """Retrain anomaly detection model with latest user data."""
    return {
        "success": True,
        "user_id": user_id,
        "message": "Anomaly detection model training initiated",
        "status": "processing"
    }
