from fastapi import APIRouter
from datetime import datetime
import logging

from backend.models import HealthResponse
from backend.utils.config import Config

router = APIRouter(prefix="/api/health", tags=["Health"])
logger = logging.getLogger(__name__)


@router.get("", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    
    Returns:
        HealthResponse: Status of the backend service
    """
    logger.info("Health check requested")
    return HealthResponse(
        status="healthy",
        message="MetaHarmonizer backend is running",
        timestamp=datetime.utcnow(),
        version=Config.VERSION,
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness_check():
    """
    Readiness check endpoint (checks if service is ready to handle requests)
    
    Returns:
        HealthResponse: Readiness status
    """
    logger.info("Readiness check requested")
    return HealthResponse(
        status="ready",
        message="MetaHarmonizer backend is ready to process requests",
        timestamp=datetime.utcnow(),
        version=Config.VERSION,
    )


@router.get("/live", response_model=HealthResponse)
async def liveness_check():
    """
    Liveness check endpoint (checks if service is alive)
    
    Returns:
        HealthResponse: Liveness status
    """
    return HealthResponse(
        status="live",
        message="MetaHarmonizer backend is live and responding",
        timestamp=datetime.utcnow(),
        version=Config.VERSION,
    )
