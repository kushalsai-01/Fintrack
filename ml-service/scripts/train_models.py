"""
ML Model Training Script
Trains initial models if they don't exist or recreates them.

Usage: python scripts/train_models.py
"""
import os
import sys
import logging
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = Path(settings.MODEL_PATH if hasattr(settings, 'MODEL_PATH') else "/app/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def create_sample_training_data():
    """Create sample training data for initial model training."""
    
    # Category prediction training data
    category_data = pd.DataFrame({
        'description': [
            'Starbucks Coffee', 'Whole Foods Market', 'Shell Gas Station', 'Amazon Purchase',
            'Netflix Subscription', 'Gym Membership', 'Electric Bill', 'Mobile Phone Bill',
            'Uber Ride', 'Movie Tickets', 'Restaurant Dinner', 'Grocery Shopping',
            'Gas Station', 'Online Shopping', 'Streaming Service', 'Fitness Center',
            'Utility Payment', 'Phone Service', 'Rideshare', 'Entertainment',
            'Walmart', 'Target Store', 'CVS Pharmacy', 'Fast Food', 'Coffee Shop',
            'Safeway', 'Costco', 'Walgreens', 'McDonalds', 'Chipotle',
        ],
        'category': [
            'Dining', 'Groceries', 'Transportation', 'Shopping',
            'Entertainment', 'Healthcare', 'Utilities', 'Utilities',
            'Transportation', 'Entertainment', 'Dining', 'Groceries',
            'Transportation', 'Shopping', 'Entertainment', 'Healthcare',
            'Utilities', 'Utilities', 'Transportation', 'Entertainment',
            'Shopping', 'Shopping', 'Healthcare', 'Dining', 'Dining',
            'Groceries', 'Groceries', 'Healthcare', 'Dining', 'Dining',
        ]
    })
    
    # Anomaly detection training data (normal transactions)
    anomaly_data = pd.DataFrame({
        'amount': np.random.normal(50, 30, 1000).clip(5, 500),  # Normal spending: $5-500
        'day_of_week': np.random.randint(0, 7, 1000),
        'hour_of_day': np.random.randint(6, 23, 1000),  # 6 AM - 11 PM
    })
    
    return category_data, anomaly_data


def train_category_model():
    """Train category prediction model."""
    logger.info("Training category prediction model...")
    
    # Load or create training data
    category_data, _ = create_sample_training_data()
    
    # Create pipeline with TF-IDF and Multinomial Naive Bayes
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=100, ngram_range=(1, 2))),
        ('clf', MultinomialNB(alpha=0.1))
    ])
    
    # Train model
    X = category_data['description']
    y = category_data['category']
    model.fit(X, y)
    
    # Save model
    model_path = MODEL_DIR / 'category_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    logger.info(f"✅ Category model saved to {model_path}")
    
    # Test model
    test_descriptions = ['Starbucks', 'Whole Foods', 'Shell Gas']
    predictions = model.predict(test_descriptions)
    logger.info(f"   Test predictions: {dict(zip(test_descriptions, predictions))}")
    
    return model


def train_anomaly_model():
    """Train anomaly detection model."""
    logger.info("Training anomaly detection model...")
    
    # Load or create training data
    _, anomaly_data = create_sample_training_data()
    
    # Create Isolation Forest model
    model = IsolationForest(
        contamination=0.1,  # Expect 10% anomalies
        random_state=42,
        n_estimators=100
    )
    
    # Train model
    X = anomaly_data[['amount', 'day_of_week', 'hour_of_day']]
    model.fit(X)
    
    # Save model
    model_path = MODEL_DIR / 'anomaly_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    logger.info(f"✅ Anomaly model saved to {model_path}")
    
    # Test model
    test_transaction = pd.DataFrame({
        'amount': [1000],  # Unusual high amount
        'day_of_week': [3],
        'hour_of_day': [14]
    })
    prediction = model.predict(test_transaction)
    is_anomaly = prediction[0] == -1
    logger.info(f"   Test prediction (amount=$1000): {'ANOMALY' if is_anomaly else 'NORMAL'}")
    
    return model


def train_forecast_model():
    """Create forecast model configuration (ARIMA params will be fit per-user)."""
    logger.info("Creating forecast model configuration...")
    
    # For time-series forecasting, we store configuration rather than a trained model
    # since models need to be fit per-user based on their transaction history
    forecast_config = {
        'model_type': 'ARIMA',
        'order': (1, 1, 1),  # (p, d, q) parameters
        'seasonal_order': (0, 0, 0, 0),  # No seasonality for now
        'min_data_points': 30,  # Minimum transactions needed
        'forecast_horizons': [7, 14, 30],  # Days to forecast
    }
    
    # Save configuration
    config_path = MODEL_DIR / 'forecast_config.pkl'
    with open(config_path, 'wb') as f:
        pickle.dump(forecast_config, f)
    
    logger.info(f"✅ Forecast config saved to {config_path}")
    return forecast_config


def check_existing_models():
    """Check which models already exist."""
    models = {
        'category_model.pkl': MODEL_DIR / 'category_model.pkl',
        'anomaly_model.pkl': MODEL_DIR / 'anomaly_model.pkl',
        'forecast_config.pkl': MODEL_DIR / 'forecast_config.pkl',
    }
    
    existing = {}
    missing = {}
    
    for name, path in models.items():
        if path.exists():
            existing[name] = path
        else:
            missing[name] = path
    
    return existing, missing


def main():
    """Main training function."""
    logger.info("=" * 60)
    logger.info("ML Model Training Script")
    logger.info("=" * 60)
    logger.info(f"Model directory: {MODEL_DIR}")
    
    # Check existing models
    existing, missing = check_existing_models()
    
    if existing:
        logger.info(f"\nExisting models ({len(existing)}):")
        for name in existing.keys():
            logger.info(f"  ✅ {name}")
    
    if missing:
        logger.info(f"\nMissing models ({len(missing)}):")
        for name in missing.keys():
            logger.info(f"  ❌ {name}")
        
        logger.info("\nTraining missing models...\n")
        
        # Train missing models
        if 'category_model.pkl' in missing:
            train_category_model()
        
        if 'anomaly_model.pkl' in missing:
            train_anomaly_model()
        
        if 'forecast_config.pkl' in missing:
            train_forecast_model()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Model training complete!")
        logger.info("=" * 60)
    else:
        logger.info("\n✅ All models already exist. Skipping training.")
        logger.info("   To retrain, delete models from " + str(MODEL_DIR))
    
    # Print model info
    logger.info(f"\nModel files in {MODEL_DIR}:")
    for file in MODEL_DIR.glob("*.pkl"):
        size_kb = file.stat().st_size / 1024
        logger.info(f"  - {file.name} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
