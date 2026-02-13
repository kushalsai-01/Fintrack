"""
Health Check Router - Service health and readiness checks
"""
from fastapi import APIRouter
from datetime import datetime
import os
import glob

router = APIRouter()


@router.get("")
async def health_check():
    """
    Service health check endpoint.
    
    Returns service status, model availability, and system info.
    Used by Docker healthcheck and monitoring systems.
    """
    health = {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "FinTrack ML Service",
        "version": "1.0.0",
        "status": "healthy"
    }
    
    # Check if model directory exists and has models
    model_dir = os.getenv("MODEL_DIR", "/app/models")
    models_loaded = False
    
    try:
        if os.path.exists(model_dir):
            model_files = glob.glob(os.path.join(model_dir, "**/*.pkl"), recursive=True)
            model_files += glob.glob(os.path.join(model_dir, "**/*.joblib"), recursive=True)
            models_loaded = len(model_files) > 0
            health["models"] = {
                "directory": model_dir,
                "count": len(model_files),
                "loaded": models_loaded
            }
    except Exception as e:
        health["models"] = {"error": str(e), "loaded": False}
    
    #Check Python package availability
    dependencies = {}
    try:
        import numpy
        dependencies["numpy"] = numpy.__version__
    except ImportError:
        dependencies["numpy"] = "not installed"
    
    try:
        import pandas
        dependencies["pandas"] = pandas.__version__
    except ImportError:
        dependencies["pandas"] = "not installed"
    
    try:
        import sklearn
        dependencies["sklearn"] = sklearn.__version__
    except ImportError:
        dependencies["sklearn"] = "not installed"
    
    try:
        import pytesseract
        dependencies["pytesseract"] = "installed"
    except ImportError:
        dependencies["pytesseract"] = "not installed"
    
    health["dependencies"] = dependencies
    health["models_loaded"] = models_loaded
    
    return health


@router.get("/ready")
async def readiness_check():
    """
    Readiness check - returns 200 only if service is ready to accept requests.
    
    Used by Kubernetes and load balancers to determine if traffic should be routed.
    """
    # Check critical dependencies
    try:
        import numpy
        import pandas
        import sklearn
        
        return {
            "ready": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    except ImportError as e:
        return {
            "ready": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/live")
async def liveness_check():
    """
    Liveness check - returns 200 if service is alive.
    
    Used by Kubernetes to determine if pod should be restarted.
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat()
    }
