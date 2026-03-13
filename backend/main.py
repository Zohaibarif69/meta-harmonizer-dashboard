from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import uuid

from backend.utils import setup_logging, get_logger
from backend.utils.config import Config
from backend.routers import health, metrics, mapper
from backend.models import ErrorResponse
from backend import curator_routes, database

# Setup logging
setup_logging()
logger = get_logger(__name__)


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown"""
    logger.info("MetaHarmonizer backend starting up...")
    Config.validate()
    logger.info(f"Configuration: {Config.to_dict()}")
    
    # Initialize database and create tables
    logger.info("Initializing database...")
    database.init_db()
    logger.info("Database initialized successfully")
    
    yield
    logger.info("MetaHarmonizer backend shutting down...")


# Create FastAPI application
app = FastAPI(
    title="MetaHarmonizer Backend API",
    description="Backend API for MetaHarmonizer - Schema Mapping Harmonization Engine",
    version=Config.VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=Config.CORS_ALLOW_CREDENTIALS,
    allow_methods=Config.CORS_ALLOW_METHODS,
    allow_headers=Config.CORS_ALLOW_HEADERS,
)


# Request ID middleware for tracking
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID for logging and tracking"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Log request
    logger.info(
        f"[{request_id}] {request.method} {request.url.path} - "
        f"Client: {request.client.host if request.client else 'unknown'}"
    )

    response = await call_next(request)

    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id

    return response


# Include routers
app.include_router(health.router)
app.include_router(metrics.router)
app.include_router(mapper.router)
app.include_router(curator_routes.router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - returns API information"""
    return {
        "app_name": Config.APP_NAME,
        "version": Config.VERSION,
        "status": "running",
        "documentation": "/api/docs",
        "openapi": "/api/openapi.json",
    }


@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {
        "message": "MetaHarmonizer Backend API",
        "version": Config.API_VERSION,
        "endpoints": {
            "health": "/api/health",
            "metrics": "/api/metrics",
            "mapper": "/api/mapper",
        },
        "documentation": "/api/docs",
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.error(
        f"[{request_id}] Unhandled exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True
    )

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_SERVER_ERROR",
            detail=str(exc) if Config.DEBUG else "An error occurred processing your request",
            timestamp="2024-01-01T00:00:00Z",
            request_id=request_id,
        ).dict(),
    )


# Health check for container orchestration
@app.get("/healthz")
async def k8s_health():
    """Kubernetes-style health check"""
    return {"status": "ok"}


@app.get("/readyz")
async def k8s_ready():
    """Kubernetes-style readiness check"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting server on {Config.HOST}:{Config.PORT}")
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.DEBUG,
        log_level=Config.LOG_LEVEL.lower(),
    )
