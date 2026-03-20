"""
Per-User ML Model Training Router
Trains personalized transaction categorization models per user.
Falls back to the global model when insufficient data.
"""

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import json
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MIN_SAMPLES = 20


class TrainRequest(BaseModel):
    user_id: str
    transactions: List[dict]  # [{description, amount, category}]


class TrainResponse(BaseModel):
    status: str
    user_id: str
    samples: Optional[int] = None
    reason: Optional[str] = None
    using: Optional[str] = None


class ModelStatusResponse(BaseModel):
    has_personal_model: bool
    user_id: str
    trained_at: Optional[str] = None
    num_samples: Optional[int] = None
    categories: Optional[List[str]] = None
    using: Optional[str] = None


@router.post("/train/{user_id}", response_model=TrainResponse)
async def train_user_model(
    user_id: str,
    request: TrainRequest,
    background_tasks: BackgroundTasks,
):
    """
    Kick off personalized model training for a user.
    Requires at least 20 labelled transactions. Runs as a background task.
    """
    if len(request.transactions) < MIN_SAMPLES:
        return TrainResponse(
            status="skipped",
            user_id=user_id,
            reason=f"Need at least {MIN_SAMPLES} transactions, got {len(request.transactions)}",
            using="global_model",
        )

    background_tasks.add_task(_train_model_task, user_id, request.transactions)
    return TrainResponse(
        status="training_started",
        user_id=user_id,
        samples=len(request.transactions),
    )


async def _train_model_task(user_id: str, transactions: List[dict]) -> None:
    """Background task: build and persist a per-user sklearn pipeline."""
    try:
        import pandas as pd
        from sklearn.pipeline import Pipeline
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        import joblib

        df = pd.DataFrame(transactions)
        df = df.dropna(subset=["description", "category"])
        df = df[df["category"].str.strip() != ""]

        if len(df) < 10:
            logger.warning(f"After cleanup, only {len(df)} rows for user {user_id} — skipping")
            return

        # Feature: description text + amount bucket
        df["amount_bucket"] = pd.cut(
            df["amount"].astype(float).abs(),
            bins=[0, 10, 50, 200, 1000, float("inf")],
            labels=["tiny", "small", "medium", "large", "huge"],
        ).astype(str)
        df["features"] = df["description"].str.lower() + " " + df["amount_bucket"]

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)),
            ("clf", LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced")),
        ])
        pipeline.fit(df["features"], df["category"])

        model_path = MODEL_DIR / f"user_{user_id}.joblib"
        meta_path = MODEL_DIR / f"user_{user_id}_meta.json"

        joblib.dump(pipeline, str(model_path))

        meta = {
            "user_id": user_id,
            "trained_at": datetime.utcnow().isoformat(),
            "num_samples": len(df),
            "categories": df["category"].unique().tolist(),
        }
        with open(str(meta_path), "w") as f:
            json.dump(meta, f)

        logger.info(f"Personal model saved for user {user_id} ({len(df)} samples, {len(meta['categories'])} categories)")

    except Exception as exc:
        logger.error(f"Training failed for user {user_id}: {exc}", exc_info=True)


@router.get("/model-status/{user_id}", response_model=ModelStatusResponse)
async def get_model_status(user_id: str) -> ModelStatusResponse:
    """Check whether a user has a personalized model and its metadata."""
    meta_path = MODEL_DIR / f"user_{user_id}_meta.json"
    model_path = MODEL_DIR / f"user_{user_id}.joblib"

    if meta_path.exists() and model_path.exists():
        try:
            with open(str(meta_path)) as f:
                meta = json.load(f)
            return ModelStatusResponse(
                has_personal_model=True,
                user_id=user_id,
                trained_at=meta.get("trained_at"),
                num_samples=meta.get("num_samples"),
                categories=meta.get("categories"),
            )
        except Exception:
            pass

    return ModelStatusResponse(
        has_personal_model=False,
        user_id=user_id,
        using="global_model",
    )


def load_user_model_or_global(user_id: Optional[str]):
    """
    Load a per-user joblib model if it exists; otherwise return None
    so callers can fall back to the global pickle model.
    """
    if not user_id:
        return None
    try:
        import joblib
        model_path = MODEL_DIR / f"user_{user_id}.joblib"
        if model_path.exists():
            return joblib.load(str(model_path))
    except Exception as exc:
        logger.warning(f"Failed to load personal model for {user_id}: {exc}")
    return None
