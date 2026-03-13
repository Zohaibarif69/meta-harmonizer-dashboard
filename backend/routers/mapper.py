from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import uuid
import asyncio
from enum import Enum

from backend.models import (
    MapperRunRequest,
    MapperStatus,
    MapperResult,
)
from backend.utils.config import Config, load_metrics_file, SAMPLE_METRICS

router = APIRouter(prefix="/api/mapper", tags=["Mapper"])
logger = logging.getLogger(__name__)

# In-memory job tracking
_jobs: Dict[str, Dict[str, Any]] = {}


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@router.post("/run", response_model=Dict[str, Any])
async def run_mapper(request: MapperRunRequest, background_tasks: BackgroundTasks):
    """
    Trigger mapper execution
    
    Args:
        request: MapperRunRequest with mapper configuration
        background_tasks: FastAPI background tasks
    
    Returns:
        Dict: Job ID and initial status
    """
    if not Config.ENABLE_MAPPER_EXECUTION:
        raise HTTPException(
            status_code=503,
            detail="Mapper execution is disabled in this environment"
        )

    logger.info(f"Mapper run requested with method: {request.mapper_method}")

    # Validate mapper method
    if request.mapper_method not in Config.SUPPORTED_METHODS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported mapper method: {request.mapper_method}. Supported: {Config.SUPPORTED_METHODS}"
        )

    # Create job
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": JobStatus.QUEUED,
        "created_at": datetime.utcnow(),
        "mapper_method": request.mapper_method,
        "input_file": request.input_file,
        "use_cache": request.use_cache,
        "dry_run": request.dry_run,
        "progress": 0.0,
        "message": "Job queued",
        "started_at": None,
        "completed_at": None,
        "result": None,
        "error": None,
    }

    logger.info(f"Mapper job created: {job_id}")

    # Schedule background execution
    background_tasks.add_task(_execute_mapper, job_id)

    return {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "message": "Mapper execution queued"
    }


@router.get("/status/{job_id}", response_model=MapperStatus)
async def get_mapper_status(job_id: str):
    """
    Get status of a mapper job
    
    Args:
        job_id: Job ID to check
    
    Returns:
        MapperStatus: Current job status
    """
    logger.info(f"Status check for job: {job_id}")

    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    job = _jobs[job_id]

    return MapperStatus(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress", 0.0),
        message=job.get("message", ""),
        started_at=job.get("started_at"),
        completed_at=job.get("completed_at"),
        total_items=job.get("total_items"),
        processed_items=job.get("processed_items"),
        error=job.get("error"),
    )


@router.get("/result/{job_id}", response_model=MapperResult)
async def get_mapper_result(job_id: str):
    """
    Get result of a completed mapper job
    
    Args:
        job_id: Job ID to get results for
    
    Returns:
        MapperResult: Job result with metrics
    """
    logger.info(f"Result request for job: {job_id}")

    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    job = _jobs[job_id]

    if job["status"] == JobStatus.RUNNING:
        raise HTTPException(
            status_code=202,
            detail="Job is still running. Check status endpoint for progress."
        )

    if job["status"] == JobStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail=f"Job failed: {job.get('error', 'Unknown error')}"
        )

    result = job.get("result")
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    return MapperResult(**result)


@router.get("/jobs")
async def list_mapper_jobs(status: Optional[str] = None):
    """
    List all mapper jobs with optional filtering
    
    Args:
        status: Optional filter by job status
    
    Returns:
        List of jobs
    """
    logger.info(f"Jobs list requested (filter: {status})")

    jobs_list = []
    for job_id, job in _jobs.items():
        if status and job["status"] != status:
            continue

        jobs_list.append({
            "job_id": job_id,
            "status": job["status"],
            "created_at": job["created_at"],
            "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at"),
            "mapper_method": job["mapper_method"],
            "progress": job.get("progress", 0.0),
            "message": job.get("message", ""),
        })

    return jobs_list


@router.post("/cancel/{job_id}")
async def cancel_mapper_job(job_id: str):
    """
    Cancel a running mapper job
    
    Args:
        job_id: Job ID to cancel
    
    Returns:
        Dict: Cancellation status
    """
    logger.info(f"Cancellation requested for job: {job_id}")

    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    job = _jobs[job_id]

    if job["status"] not in [JobStatus.QUEUED, JobStatus.RUNNING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status: {job['status']}"
        )

    job["status"] = JobStatus.CANCELLED
    job["message"] = "Job cancelled by user"
    job["completed_at"] = datetime.utcnow()

    logger.info(f"Job cancelled: {job_id}")

    return {"job_id": job_id, "status": JobStatus.CANCELLED}


@router.get("/config")
async def get_mapper_config():
    """
    Get mapper configuration and supported methods
    
    Returns:
        Dict: Mapper configuration
    """
    return {
        "enabled": Config.ENABLE_MAPPER_EXECUTION,
        "default_method": Config.DEFAULT_MAPPER_METHOD,
        "supported_methods": Config.SUPPORTED_METHODS,
        "timeout": Config.MAPPER_TIMEOUT,
        "batch_size": Config.MAPPER_BATCH_SIZE,
        "cache_enabled": Config.CACHE_ENABLED,
        "cache_ttl": Config.CACHE_TTL,
    }


# Background task for mapper execution
async def _execute_mapper(job_id: str):
    """Background task to execute mapper"""
    
    job = _jobs[job_id]

    try:
        logger.info(f"Starting mapper execution for job: {job_id}")

        # Update job status
        job["status"] = JobStatus.RUNNING
        job["started_at"] = datetime.utcnow()
        job["message"] = f"Initializing mapper (method: {job['mapper_method']})"
        job["progress"] = 0.1

        # Simulate mapper initialization
        await asyncio.sleep(1)

        # Simulate processing
        job["message"] = "Processing mappings..."
        job["progress"] = 0.3
        await asyncio.sleep(2)

        job["progress"] = 0.6
        job["message"] = "Evaluating results..."
        await asyncio.sleep(1)

        job["progress"] = 0.9
        job["message"] = "Generating metrics..."

        # Load metrics (either from file or sample)
        metrics_data = load_metrics_file() or SAMPLE_METRICS

        # Simulate completion
        await asyncio.sleep(1)

        # Create result
        result = {
            "job_id": job_id,
            "status": JobStatus.COMPLETED,
            "total_mappings": metrics_data.get("metrics", {}).get("total_mappings", 100),
            "successful_mappings": metrics_data.get("metrics", {}).get("correct_mappings", 85),
            "failed_mappings": 100 - metrics_data.get("metrics", {}).get("correct_mappings", 85),
            "processing_time_seconds": (
                (datetime.utcnow() - job["started_at"]).total_seconds()
            ),
            "output_file": f"results/mapper_output_{job_id[:8]}.json",
            "error": None,
        }

        # Update job
        job["status"] = JobStatus.COMPLETED
        job["completed_at"] = datetime.utcnow()
        job["progress"] = 1.0
        job["message"] = "Mapper execution completed"
        job["result"] = result

        logger.info(f"Mapper execution completed for job: {job_id}")

    except Exception as e:
        logger.error(f"Mapper execution failed for job {job_id}: {e}", exc_info=True)

        job["status"] = JobStatus.FAILED
        job["completed_at"] = datetime.utcnow()
        job["error"] = str(e)
        job["message"] = f"Mapper execution failed: {str(e)}"
