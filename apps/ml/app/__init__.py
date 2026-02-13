"""
FinTrack ML Service - Package Init
"""
from app.config import settings

__version__ = settings.APP_VERSION
__all__ = ["settings"]
