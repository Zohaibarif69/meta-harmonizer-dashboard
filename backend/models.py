from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


# ============ Health Check Models ============
class HealthResponse(BaseModel):
    status: str
    message: str
    timestamp: datetime
    version: str


# ============ Metrics Models ============
class MetricStats(BaseModel):
    total_mappings: int
    correct_mappings: int
    high_confidence_correct: int
    accuracy: float
    confidence_mean: float
    confidence_median: float
    confidence_std: float


class ConfidenceBreakdown(BaseModel):
    excellent: int  # 0.9-1.0
    good: int  # 0.7-0.9
    moderate: int  # 0.5-0.7
    low: int  # 0.3-0.5
    very_low: int  # 0.0-0.3


class MethodMetrics(BaseModel):
    method_name: str
    count: int
    correct: int
    avg_confidence: float
    accuracy: float


class FailureCase(BaseModel):
    field_name: str
    expected_value: str
    predicted_value: str
    confidence: float
    failure_type: str  # invalid_mapping, low_confidence, etc.
    proposed_fix: Optional[str] = None


class MetricsResponse(BaseModel):
    timestamp: datetime
    metrics: MetricStats
    confidence_distribution: ConfidenceBreakdown
    method_performance: List[MethodMetrics]
    failure_cases: List[FailureCase]
    metadata: Dict[str, Any]

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2024-01-01T12:00:00Z",
                "metrics": {
                    "total_mappings": 100,
                    "correct_mappings": 85,
                    "high_confidence_correct": 78,
                    "accuracy": 0.85,
                    "confidence_mean": 0.82,
                    "confidence_median": 0.85,
                    "confidence_std": 0.12
                },
                "confidence_distribution": {
                    "excellent": 60,
                    "good": 25,
                    "moderate": 10,
                    "low": 4,
                    "very_low": 1
                },
                "method_performance": [
                    {
                        "method_name": "FTS",
                        "count": 50,
                        "correct": 45,
                        "avg_confidence": 0.88,
                        "accuracy": 0.90
                    }
                ],
                "failure_cases": [
                    {
                        "field_name": "patient_age",
                        "expected_value": "AGE_AT_INDEX",
                        "predicted_value": "AGE",
                        "confidence": 0.45,
                        "failure_type": "low_confidence",
                        "proposed_fix": "Add synonym mapping: AGE → AGE_AT_INDEX"
                    }
                ],
                "metadata": {
                    "data_source": "synthetic_eval_data",
                    "evaluation_date": "2024-01-01"
                }
            }
        }


# ============ Mapper Models ============
class MapperRunRequest(BaseModel):
    input_file: Optional[str] = None
    mapper_method: Optional[str] = "rag"  # fts, st, bi_encoder, lm, rag, synonym
    use_cache: bool = True
    dry_run: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "input_file": "data/schema_mapping_eval/new_meta.csv",
                "mapper_method": "rag",
                "use_cache": True,
                "dry_run": False
            }
        }


class MapperStatus(BaseModel):
    job_id: str
    status: str  # queued, running, completed, failed
    progress: float  # 0.0 to 1.0
    message: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_items: Optional[int] = None
    processed_items: Optional[int] = None
    error: Optional[str] = None


class MapperResult(BaseModel):
    job_id: str
    status: str
    total_mappings: int
    successful_mappings: int
    failed_mappings: int
    processing_time_seconds: float
    metrics: Optional[MetricsResponse] = None
    output_file: Optional[str] = None
    error: Optional[str] = None


# ============ Configuration Models ============
class ConfigResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    debug: bool
    api_version: str
    supported_methods: List[str]
    features: Dict[str, bool]

    class Config:
        json_schema_extra = {
            "example": {
                "app_name": "MetaHarmonizer",
                "version": "1.0.0",
                "environment": "development",
                "debug": True,
                "api_version": "v1",
                "supported_methods": ["fts", "st", "bi_encoder", "lm", "rag", "synonym"],
                "features": {
                    "mapper_execution": True,
                    "metrics_evaluation": True,
                    "caching": True,
                    "web_ui": True
                }
            }
        }


# ============ Error Models ============
class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime
    request_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "error": "MAPPER_ERROR",
                "detail": "Failed to initialize mapper: missing required file",
                "timestamp": "2024-01-01T12:00:00Z",
                "request_id": "req_12345xyz"
            }
        }
