"""
Configuration settings for the curator workflow API
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # API Configuration
    api_title: str = "MetaHarmonizer Curator Workflow API"
    api_version: str = "1.0.0"
    api_description: str = "API for managing curator workflow in MetaHarmonizer"
    
    # Server Configuration
    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = True  # Auto-reload on file changes in development
    
    # Database Configuration
    database_url: str = "sqlite:///./curator_workflow.db"
    
    # CORS Configuration
    cors_origins: list = ["http://localhost:3000", "http://localhost:8000"]
    cors_credentials: bool = True
    cors_methods: list = ["*"]
    cors_headers: list = ["*"]
    
    # File Upload Configuration
    max_upload_size_mb: int = 100
    upload_directory: str = "./uploads"
    export_directory: str = "./exports"
    
    # Mapper Configuration
    mapper_confidence_threshold: float = 0.5
    mapper_timeout_seconds: int = 60
    
    # Logging Configuration
    log_level: str = "INFO"
    log_file: Optional[str] = "./logs/curator_api.log"
    
    # Feature Flags
    enable_auto_suggestions: bool = True
    enable_bulk_operations: bool = True
    enable_audit_trail: bool = True
    
    class Config:
        """Load settings from .env file"""
        env_file = ".env"
        env_file_encoding = "utf-8"


# Load settings
settings = Settings()

# Ensure directories exist
os.makedirs(settings.upload_directory, exist_ok=True)
os.makedirs(settings.export_directory, exist_ok=True)
if settings.log_file:
    os.makedirs(os.path.dirname(settings.log_file), exist_ok=True)
