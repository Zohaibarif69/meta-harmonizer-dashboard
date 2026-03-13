import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class Config:
    """Configuration management for MetaHarmonizer backend"""

    # Application settings
    APP_NAME = os.getenv("APP_NAME", "MetaHarmonizer Backend")
    VERSION = "1.0.0"
    API_VERSION = "v1"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"

    # Server settings
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", 8000))

    # Paths
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    METRICS_FILE = BASE_DIR / "mapper_evaluation_metrics.json"
    MAPPER_CONFIG_FILE = BASE_DIR / "src" / "models" / "method_model.yaml"

    # Feature flags
    ENABLE_MAPPER_EXECUTION = os.getenv("ENABLE_MAPPER_EXECUTION", "True").lower() == "true"
    ENABLE_METRICS_EVALUATION = os.getenv("ENABLE_METRICS_EVALUATION", "True").lower() == "true"
    ENABLE_CACHING = os.getenv("ENABLE_CACHING", "True").lower() == "true"
    ENABLE_WEB_UI = os.getenv("ENABLE_WEB_UI", "True").lower() == "true"

    # Mapper settings
    DEFAULT_MAPPER_METHOD = os.getenv("DEFAULT_MAPPER_METHOD", "rag")
    MAPPER_TIMEOUT = int(os.getenv("MAPPER_TIMEOUT", 300))
    MAPPER_BATCH_SIZE = int(os.getenv("MAPPER_BATCH_SIZE", 100))

    # Cache settings
    CACHE_ENABLED = os.getenv("CACHE_ENABLED", "True").lower() == "true"
    CACHE_TTL = int(os.getenv("CACHE_TTL", 3600))  # 1 hour in seconds
    CACHE_MAX_SIZE = int(os.getenv("CACHE_MAX_SIZE", 100))

    # CORS settings
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "True").lower() == "true"
    CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS = ["*"]

    # Logging settings
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "backend.log")

    # Supported mapper methods
    SUPPORTED_METHODS = [
        "fts",  # Full-text search
        "st",  # Sentence Transformer
        "bi_encoder",  # BiEncoder
        "lm",  # Language Model
        "rag",  # RAG (Retrieval Augmented Generation)
        "synonym",  # Synonym-based mapping
    ]

    @staticmethod
    def validate():
        """Validate configuration"""
        errors = []

        if not Config.DATA_DIR.exists():
            errors.append(f"Data directory not found: {Config.DATA_DIR}")

        if Config.PORT < 1 or Config.PORT > 65535:
            errors.append(f"Invalid port number: {Config.PORT}")

        if Config.DEFAULT_MAPPER_METHOD not in Config.SUPPORTED_METHODS:
            errors.append(
                f"Invalid default mapper method: {Config.DEFAULT_MAPPER_METHOD}"
            )

        if errors:
            logger.error(f"Configuration validation failed: {errors}")
            raise ValueError(f"Configuration errors: {', '.join(errors)}")

        logger.info("Configuration validated successfully")

    @staticmethod
    def to_dict() -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "app_name": Config.APP_NAME,
            "version": Config.VERSION,
            "api_version": Config.API_VERSION,
            "environment": Config.ENVIRONMENT,
            "debug": Config.DEBUG,
            "host": Config.HOST,
            "port": Config.PORT,
            "supported_methods": Config.SUPPORTED_METHODS,
            "features": {
                "mapper_execution": Config.ENABLE_MAPPER_EXECUTION,
                "metrics_evaluation": Config.ENABLE_METRICS_EVALUATION,
                "caching": Config.ENABLE_CACHING,
                "web_ui": Config.ENABLE_WEB_UI,
            },
        }


def load_metrics_file() -> Optional[Dict[str, Any]]:
    """Load metrics from JSON file"""
    try:
        if Config.METRICS_FILE.exists():
            with open(Config.METRICS_FILE, "r") as f:
                logger.info(f"Metrics loaded from {Config.METRICS_FILE}")
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load metrics file: {e}")

    return None


def save_metrics_file(metrics: Dict[str, Any]) -> bool:
    """Save metrics to JSON file"""
    try:
        Config.METRICS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(Config.METRICS_FILE, "w") as f:
            json.dump(metrics, f, indent=2, default=str)
            logger.info(f"Metrics saved to {Config.METRICS_FILE}")
            return True
    except Exception as e:
        logger.error(f"Failed to save metrics file: {e}")
        return False


# Sample metrics data for fallback
SAMPLE_METRICS = {
    "timestamp": "2024-01-15T14:30:00Z",
    "metrics": {
        "total_mappings": 100,
        "correct_mappings": 87,
        "high_confidence_correct": 79,
        "accuracy": 0.87,
        "confidence_mean": 0.83,
        "confidence_median": 0.86,
        "confidence_std": 0.11,
    },
    "confidence_distribution": {
        "excellent": 65,
        "good": 22,
        "moderate": 8,
        "low": 3,
        "very_low": 2,
    },
    "method_performance": [
        {
            "method_name": "FTS",
            "count": 35,
            "correct": 32,
            "avg_confidence": 0.85,
            "accuracy": 0.914,
        },
        {
            "method_name": "Sentence Transformer",
            "count": 35,
            "correct": 31,
            "avg_confidence": 0.81,
            "accuracy": 0.886,
        },
        {
            "method_name": "BiEncoder",
            "count": 15,
            "correct": 14,
            "avg_confidence": 0.79,
            "accuracy": 0.933,
        },
        {
            "method_name": "RAG",
            "count": 15,
            "correct": 10,
            "avg_confidence": 0.75,
            "accuracy": 0.667,
        },
    ],
    "failure_cases": [
        {
            "field_name": "patient_age",
            "expected_value": "AGE_AT_INDEX",
            "predicted_value": "AGE",
            "confidence": 0.42,
            "failure_type": "low_confidence",
            "proposed_fix": "Add synonym mapping: AGE → AGE_AT_INDEX",
        },
        {
            "field_name": "disease_code",
            "expected_value": "DISEASE_CODE",
            "predicted_value": "DISEASE",
            "confidence": 0.38,
            "failure_type": "low_confidence",
            "proposed_fix": "Improve NCIT database coverage for disease codes",
        },
        {
            "field_name": "treatment_date",
            "expected_value": "TREATMENT_DATE",
            "predicted_value": "DATE",
            "confidence": 0.35,
            "failure_type": "partial_match",
            "proposed_fix": "Add temporal context awareness to FTS pipeline",
        },
    ],
    "metadata": {
        "data_source": "synthetic_eval_data",
        "evaluation_date": "2024-01-15",
        "total_records_evaluated": 100,
        "evaluation_duration_seconds": 45.2,
    },
}
