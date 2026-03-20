"""
Category Prediction Router - ML-based auto-categorization of transactions
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from functools import lru_cache
from datetime import datetime
from pathlib import Path

import pickle

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.config import settings

router = APIRouter()

MODEL_DIR = Path(settings.MODEL_PATH)
DEFAULT_MODEL_PATH = MODEL_DIR / 'category_model.pkl'


class PredictionRequest(BaseModel):
    """Request for single category prediction."""
    description: str
    amount: float
    merchant: Optional[str] = None
    user_id: Optional[str] = None


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


@lru_cache(maxsize=1)
def load_category_model() -> Pipeline:
    if not DEFAULT_MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing category model: {DEFAULT_MODEL_PATH}")
    with open(DEFAULT_MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    return model


def _predict_with_model(text: str) -> CategoryPrediction:
    model = load_category_model()

    # MultinomialNB outputs probabilities for classes.
    probs = model.predict_proba([text])[0]
    clf = model.named_steps.get('clf') if hasattr(model, 'named_steps') else None
    classes = clf.classes_ if clf is not None and hasattr(clf, 'classes_') else model.classes_

    top_indices = np.argsort(probs)[::-1][:3]
    top_idx = int(top_indices[0])

    predicted = str(classes[top_idx])
    confidence = float(probs[top_idx])

    alternatives: List[Dict[str, float]] = []
    for idx in top_indices[1:]:
        cat = str(classes[int(idx)])
        alternatives.append({cat: float(round(probs[int(idx)], 4))})

    # Apply confidence floor: if too uncertain, return "Other"
    if confidence < 0.6:
        return CategoryPrediction(
            predicted_category="Other",
            confidence=round(confidence, 4),
            alternatives=alternatives,
        )

    return CategoryPrediction(
        predicted_category=predicted,
        confidence=round(confidence, 4),
        alternatives=alternatives,
    )


def _predict_with_pipeline(model, text: str) -> CategoryPrediction:
    """Run prediction on any sklearn Pipeline (global or per-user)."""
    try:
        probs = model.predict_proba([text])[0]
        clf = model.named_steps.get('clf') if hasattr(model, 'named_steps') else None
        classes = clf.classes_ if clf is not None and hasattr(clf, 'classes_') else model.classes_

        top_indices = np.argsort(probs)[::-1][:3]
        top_idx = int(top_indices[0])
        predicted = str(classes[top_idx])
        confidence = float(probs[top_idx])

        alternatives: List[Dict[str, float]] = []
        for idx in top_indices[1:]:
            cat = str(classes[int(idx)])
            alternatives.append({cat: float(round(probs[int(idx)], 4))})

        if confidence < 0.6:
            return CategoryPrediction(predicted_category="Other", confidence=round(confidence, 4), alternatives=alternatives)

        return CategoryPrediction(predicted_category=predicted, confidence=round(confidence, 4), alternatives=alternatives)
    except Exception:
        return CategoryPrediction(predicted_category="Other", confidence=0.0, alternatives=[])


@router.post("/predict", response_model=PredictionResponse)
async def predict_single_category(request: PredictionRequest):
    text = f"{request.description} {request.merchant or ''}".strip().lower()
    try:
        # Prefer per-user model when available
        from app.routers.train import load_user_model_or_global
        personal_model = load_user_model_or_global(request.user_id)
        if personal_model is not None:
            prediction = _predict_with_pipeline(personal_model, text)
            prediction_dict = prediction.dict()
            prediction_dict["model_type"] = "personal"
            prediction = CategoryPrediction(**prediction_dict)
        else:
            prediction = _predict_with_model(text)
    except FileNotFoundError:
        prediction = CategoryPrediction(
            predicted_category="Other",
            confidence=0.0,
            alternatives=[],
        )
    return PredictionResponse(success=True, prediction=prediction)


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch_categories(request: BatchPredictionRequest):
    predictions: List[CategoryPrediction] = []
    for txn in request.transactions:
        text = f"{txn.description} {txn.merchant or ''}".strip().lower()
        try:
            predictions.append(_predict_with_model(text))
        except FileNotFoundError:
            predictions.append(
                CategoryPrediction(
                    predicted_category="Other",
                    confidence=0.0,
                    alternatives=[],
                )
            )
    return BatchPredictionResponse(success=True, predictions=predictions)


@router.get("/categories")
async def get_available_categories():
    try:
        model = load_category_model()
        clf = model.named_steps.get('clf') if hasattr(model, 'named_steps') else None
        classes = clf.classes_ if clf is not None and hasattr(clf, 'classes_') else model.classes_
        categories = [str(c) for c in classes] + ["Other"]
    except FileNotFoundError:
        categories = ["Other"]

    return {"success": True, "categories": categories}


@router.post("/train/{user_id}")
async def train_category_model(user_id: str):
    """
    Retrain the category model using the user's existing transactions.
    Saves a fresh `category_model.pkl` and clears the in-memory cache.
    """
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]

    try:
        # Load categoryId -> name map for this user.
        categories_cursor = db.categories.find(
            {"userId": ObjectId(user_id)},
            {"_id": 1, "name": 1},
        )
        category_map: Dict[str, str] = {}
        async for c in categories_cursor:
            category_map[str(c["_id"])] = str(c.get("name") or "Other")

        # Build training dataset from existing transactions.
        descriptions: List[str] = []
        labels: List[str] = []
        txn_cursor = db.transactions.find(
            {"userId": ObjectId(user_id)},
            {"description": 1, "merchant": 1, "categoryId": 1},
        ).limit(5000)

        async for t in txn_cursor:
            desc = (t.get("description") or "").strip()
            if not desc:
                continue

            cat_id = t.get("categoryId")
            if not cat_id:
                continue

            cat_name = category_map.get(str(cat_id))
            if not cat_name:
                continue

            merchant = (t.get("merchant") or "").strip()
            text = f"{desc} {merchant}".strip().lower()
            descriptions.append(text)
            labels.append(cat_name)

        if len(descriptions) < 50:
            return {
                "success": True,
                "user_id": user_id,
                "message": "Not enough user data to retrain. Using existing model.",
                "status": "skipped",
                "trained_samples": len(descriptions),
            }

        model = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=200, ngram_range=(1, 2))),
            ('clf', MultinomialNB(alpha=0.1)),
        ])
        model.fit(descriptions, labels)

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        with open(DEFAULT_MODEL_PATH, 'wb') as f:
            pickle.dump(model, f)

        load_category_model.cache_clear()

        return {
            "success": True,
            "user_id": user_id,
            "message": "Category model retrained successfully.",
            "status": "ready",
            "trained_samples": len(descriptions),
            "trained_at": datetime.utcnow().isoformat(),
        }
    finally:
        client.close()
