"""
Anomaly Detection Router - ML-based unusual transaction detection
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

import numpy as np
from pathlib import Path
import pickle
from functools import lru_cache

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.config import settings

router = APIRouter()

MODEL_DIR = Path(settings.MODEL_PATH)
DEFAULT_MODEL_PATH = MODEL_DIR / "anomaly_model.pkl"


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
    # Expected anomaly rate hint; used to pick a threshold percentile.
    sensitivity: float = 0.1  # 0.05-0.2


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
    summary: Dict[str, Any]


@lru_cache(maxsize=1)
def load_anomaly_model():
    if not DEFAULT_MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing anomaly model: {DEFAULT_MODEL_PATH}")
    with open(DEFAULT_MODEL_PATH, "rb") as f:
        return pickle.load(f)


def _build_features(transactions: List[Transaction]) -> np.ndarray:
    # Match train_models.py features: amount, day_of_week, hour_of_day
    rows = []
    for t in transactions:
        dt = t.date
        rows.append([float(t.amount), int(dt.weekday()), int(dt.hour)])
    return np.array(rows, dtype=float)


@router.post("/detect", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyRequest):
    """
    Detect anomalies using the IsolationForest model trained by `train_models.py`.
    """
    if not request.transactions:
        return AnomalyResponse(
            success=True,
            user_id=request.user_id,
            total_transactions=0,
            anomalies_found=0,
            results=[],
            summary={"message": "No transactions to analyze"},
        )

    try:
        model = load_anomaly_model()
    except FileNotFoundError:
        # Hard fallback: treat none as anomalies.
        results: List[AnomalyResult] = []
        for txn in request.transactions:
            results.append(
                AnomalyResult(
                    transaction_id=txn.id,
                    is_anomaly=False,
                    anomaly_score=0.0,
                    reason="Anomaly model not available",
                    severity="low",
                )
            )
        return AnomalyResponse(
            success=True,
            user_id=request.user_id,
            total_transactions=len(request.transactions),
            anomalies_found=0,
            results=results,
            summary={"message": "Anomaly model not available"},
        )

    X = _build_features(request.transactions)

    # IsolationForest: predict returns -1 for anomalies.
    preds = model.predict(X)

    # decision_function: higher is more normal. Convert to anomaly score (higher => more anomalous).
    if hasattr(model, "decision_function"):
        decision = model.decision_function(X)
        raw_scores = (-decision).astype(float)
    else:
        raw_scores = np.where(preds == -1, 1.0, 0.1).astype(float)

    min_s = float(np.min(raw_scores))
    max_s = float(np.max(raw_scores))
    denom = max(max_s - min_s, 1e-9)
    scores_norm = (raw_scores - min_s) / denom

    # Threshold derived from sensitivity (sensitivity ~ expected anomaly rate).
    # Example: sensitivity=0.1 -> threshold at 90th percentile.
    percentile = max(50.0, min(99.0, 100.0 - (request.sensitivity * 100.0)))
    threshold = float(np.percentile(scores_norm, percentile))

    mean_amount = float(np.mean([t.amount for t in request.transactions])) if request.transactions else 0.0

    results: List[AnomalyResult] = []
    anomalies_found = 0
    for i, txn in enumerate(request.transactions):
        score = float(scores_norm[i])
        is_anomaly = bool(preds[i] == -1 and score >= threshold)
        if is_anomaly:
            anomalies_found += 1
            if score >= 0.85:
                severity = "high"
                reason = f"Unusually unusual pattern: ${txn.amount:.2f} vs avg ${mean_amount:.2f}"
            elif score >= 0.65:
                severity = "medium"
                reason = f"Atypical transaction amount/time: ${txn.amount:.2f}"
            else:
                severity = "low"
                reason = f"Possible anomaly: ${txn.amount:.2f}"
        else:
            severity = "low"
            reason = "Normal transaction"

        results.append(
            AnomalyResult(
                transaction_id=txn.id,
                is_anomaly=is_anomaly,
                anomaly_score=round(score, 3),
                reason=reason,
                severity=severity,
            )
        )

    results.sort(key=lambda x: x.anomaly_score, reverse=True)

    return AnomalyResponse(
        success=True,
        user_id=request.user_id,
        total_transactions=len(request.transactions),
        anomalies_found=anomalies_found,
        results=results,
        summary={
            "threshold": round(threshold, 3),
            "anomaly_rate_percent": round(anomalies_found / max(len(request.transactions), 1) * 100.0, 1),
            "mean_amount": round(mean_amount, 2),
        },
    )


@router.get("/recent/{user_id}", response_model=AnomalyResponse)
async def get_recent_anomalies(user_id: str, limit: int = 10):
    """
    Compute recent anomalies directly from the database (last ~90 days).
    """
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    try:
        since = datetime.utcnow() - timedelta(days=90)
        txns = []
        cursor = db.transactions.find(
            {
                "userId": ObjectId(user_id),
                "deletedAt": None,
                "date": {"$gte": since},
            },
            {"_id": 1, "amount": 1, "categoryId": 1, "date": 1, "merchant": 1},
        ).sort("date", -1).limit(max(50, limit * 5))

        async for t in cursor:
            txns.append(
                Transaction(
                    id=str(t["_id"]),
                    amount=float(t.get("amount", 0.0)),
                    category=str(t.get("categoryId", "")),
                    merchant=t.get("merchant"),
                    date=t.get("date"),
                    description=t.get("description"),
                )
            )

        # Use /detect logic
        request = AnomalyRequest(user_id=user_id, transactions=txns[:limit], sensitivity=0.1)
        return await detect_anomalies(request)
    finally:
        client.close()


@router.post("/train/{user_id}")
async def train_anomaly_model(user_id: str):
    """
    Retrain an IsolationForest model on the user's historical transactions.
    """
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]

    try:
        # Use last 180 days of data for training.
        since = datetime.utcnow() - timedelta(days=180)
        cursor = db.transactions.find(
            {"userId": ObjectId(user_id), "deletedAt": None, "date": {"$gte": since}},
            {"amount": 1, "date": 1},
        ).limit(5000)

        X_rows = []
        async for t in cursor:
            dt = t.get("date")
            if not dt:
                continue
            X_rows.append([float(t.get("amount", 0.0)), int(dt.weekday()), int(dt.hour)])

        if len(X_rows) < 50:
            return {
                "success": True,
                "user_id": user_id,
                "message": "Not enough data to retrain anomaly model.",
                "status": "skipped",
                "trained_samples": len(X_rows),
            }

        from sklearn.ensemble import IsolationForest

        X = np.array(X_rows, dtype=float)
        model = IsolationForest(contamination=0.1, random_state=42, n_estimators=200)
        model.fit(X)

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        with open(DEFAULT_MODEL_PATH, "wb") as f:
            pickle.dump(model, f)

        load_anomaly_model.cache_clear()

        return {
            "success": True,
            "user_id": user_id,
            "message": "Anomaly model retrained successfully.",
            "status": "ready",
            "trained_samples": len(X_rows),
            "trained_at": datetime.utcnow().isoformat(),
        }
    finally:
        client.close()
