from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import json
import random
import asyncio

from backend.models import (
    MetricsResponse,
    MetricStats,
    ConfidenceBreakdown,
    MethodMetrics,
    FailureCase,
)
from backend.utils.config import (
    Config,
    load_metrics_file,
    save_metrics_file,
    SAMPLE_METRICS,
)

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])
logger = logging.getLogger(__name__)

# In-memory metrics cache
_metrics_cache: Optional[MetricsResponse] = None
_cache_timestamp: Optional[datetime] = None


@router.get("", response_model=MetricsResponse)
async def get_metrics(use_cache: bool = Query(True, description="Use cached metrics if available")):
    """
    Get evaluation metrics for the mapper
    
    Returns evaluation metrics including accuracy, confidence distribution,
    method performance, and failure case analysis.
    
    Args:
        use_cache: Whether to use cached metrics (default: True)
    
    Returns:
        MetricsResponse: Complete metrics evaluation
    """
    global _metrics_cache, _cache_timestamp

    logger.info(f"Metrics requested (use_cache={use_cache})")

    # Check cache
    if use_cache and _metrics_cache is not None:
        logger.info("Returning cached metrics")
        return _metrics_cache

    # Try to load from file
    try:
        metrics_data = load_metrics_file()
        if metrics_data:
            response = _parse_metrics_response(metrics_data)
            _metrics_cache = response
            _cache_timestamp = datetime.utcnow()
            logger.info("Metrics loaded from file and cached")
            return response
    except Exception as e:
        logger.warning(f"Failed to load metrics from file: {e}")

    # Fall back to sample data
    logger.info("Using sample metrics data")
    response = _parse_metrics_response(SAMPLE_METRICS)
    _metrics_cache = response
    _cache_timestamp = datetime.utcnow()
    return response


@router.get("/summary")
async def get_metrics_summary():
    """
    Get a summary of metrics (quick overview)
    
    Returns:
        Dict with key metrics summary
    """
    logger.info("Metrics summary requested")

    metrics = await get_metrics()

    return {
        "accuracy": metrics.metrics.accuracy,
        "total_mappings": metrics.metrics.total_mappings,
        "correct_mappings": metrics.metrics.correct_mappings,
        "confidence_mean": metrics.metrics.confidence_mean,
        "method_count": len(metrics.method_performance),
        "failure_count": len(metrics.failure_cases),
        "timestamp": metrics.timestamp,
    }


@router.get("/confidence-distribution")
async def get_confidence_distribution():
    """
    Get confidence score distribution breakdown
    
    Returns:
        ConfidenceBreakdown: Distribution of confidence scores in buckets
    """
    logger.info("Confidence distribution requested")

    metrics = await get_metrics()
    return metrics.confidence_distribution


@router.get("/method-performance")
async def get_method_performance():
    """
    Get performance metrics for each mapper method
    
    Returns:
        List[MethodMetrics]: Performance for each method
    """
    logger.info("Method performance requested")

    metrics = await get_metrics()
    return metrics.method_performance


@router.get("/failure-analysis")
async def get_failure_analysis(
    failure_type: Optional[str] = Query(None, description="Filter by failure type")
):
    """
    Get analysis of failure cases
    
    Args:
        failure_type: Optional filter for specific failure type
    
    Returns:
        List[FailureCase]: Failure cases and proposed fixes
    """
    logger.info(f"Failure analysis requested (filter: {failure_type})")

    metrics = await get_metrics()

    failure_cases = metrics.failure_cases

    if failure_type:
        failure_cases = [fc for fc in failure_cases if fc.failure_type == failure_type]

    return failure_cases


@router.post("/refresh")
async def refresh_metrics(background_tasks: BackgroundTasks):
    """
    Refresh metrics (clear cache and reload)
    
    Returns:
        Dict: Refresh status
    """
    global _metrics_cache, _cache_timestamp

    logger.info("Metrics refresh requested")

    # Clear cache
    _metrics_cache = None
    _cache_timestamp = None

    # Reload
    background_tasks.add_task(get_metrics, use_cache=False)

    return {"status": "refreshing", "message": "Metrics cache cleared and reload initiated"}


@router.get("/stats")
async def get_detailed_stats():
    """
    Get detailed statistics from metrics
    
    Returns:
        Dict: Detailed statistical breakdown
    """
    logger.info("Detailed stats requested")

    metrics = await get_metrics()

    return {
        "total_mappings": metrics.metrics.total_mappings,
        "correct_mappings": metrics.metrics.correct_mappings,
        "incorrect_mappings": metrics.metrics.total_mappings - metrics.metrics.correct_mappings,
        "accuracy_percentage": metrics.metrics.accuracy * 100,
        "high_confidence_correct": metrics.metrics.high_confidence_correct,
        "high_confidence_percentage": (
            (metrics.metrics.high_confidence_correct / metrics.metrics.total_mappings * 100)
            if metrics.metrics.total_mappings > 0
            else 0
        ),
        "confidence_stats": {
            "mean": metrics.metrics.confidence_mean,
            "median": metrics.metrics.confidence_median,
            "std_dev": metrics.metrics.confidence_std,
        },
        "method_count": len(metrics.method_performance),
        "failure_count": len(metrics.failure_cases),
        "highest_accuracy_method": max(
            metrics.method_performance, key=lambda x: x.accuracy
        ).method_name if metrics.method_performance else None,
        "lowest_accuracy_method": min(
            metrics.method_performance, key=lambda x: x.accuracy
        ).method_name if metrics.method_performance else None,
    }


def _parse_metrics_response(data: Dict[str, Any]) -> MetricsResponse:
    """Parse raw metrics data into MetricsResponse model"""
    
    metrics_data = data.get("metrics", {})
    confidence_data = data.get("confidence_distribution", {})
    method_data = data.get("method_performance", [])
    failure_data = data.get("failure_cases", [])
    metadata = data.get("metadata", {})

    metrics = MetricStats(
        total_mappings=metrics_data.get("total_mappings", 0),
        correct_mappings=metrics_data.get("correct_mappings", 0),
        high_confidence_correct=metrics_data.get("high_confidence_correct", 0),
        accuracy=metrics_data.get("accuracy", 0.0),
        confidence_mean=metrics_data.get("confidence_mean", 0.0),
        confidence_median=metrics_data.get("confidence_median", 0.0),
        confidence_std=metrics_data.get("confidence_std", 0.0),
    )

    confidence = ConfidenceBreakdown(
        excellent=confidence_data.get("excellent", 0),
        good=confidence_data.get("good", 0),
        moderate=confidence_data.get("moderate", 0),
        low=confidence_data.get("low", 0),
        very_low=confidence_data.get("very_low", 0),
    )

    methods = [
        MethodMetrics(
            method_name=m.get("method_name", "Unknown"),
            count=m.get("count", 0),
            correct=m.get("correct", 0),
            avg_confidence=m.get("avg_confidence", 0.0),
            accuracy=m.get("accuracy", 0.0),
        )
        for m in method_data
    ]

    failures = [
        FailureCase(
            field_name=f.get("field_name", ""),
            expected_value=f.get("expected_value", ""),
            predicted_value=f.get("predicted_value", ""),
            confidence=f.get("confidence", 0.0),
            failure_type=f.get("failure_type", "unknown"),
            proposed_fix=f.get("proposed_fix", None),
        )
        for f in failure_data
    ]

    return MetricsResponse(
        timestamp=datetime.utcnow(),
        metrics=metrics,
        confidence_distribution=confidence,
        method_performance=methods,
        failure_cases=failures,
        metadata=metadata,
    )
