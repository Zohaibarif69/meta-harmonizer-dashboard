"""
Pydantic request and response models for API validation
"""

from pydantic import BaseModel, Field, FileUrl, validator
from typing import List, Optional, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS (mirrored from database.py)
# ============================================================================

class SessionStatusEnum(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class MappingSourceEnum(str, Enum):
    CURATOR = "curator"
    CURATOR_MANUAL = "curator_manual"
    MODEL = "model"
    UNMAPPED = "unmapped"


class ExportFormatEnum(str, Enum):
    CSV = "CSV"
    JSON = "JSON"
    PARQUET = "PARQUET"
    CUSTOM = "CUSTOM"


# ============================================================================
# REQUEST MODELS
# ============================================================================

class MetadataUploadRequest(BaseModel):
    """Request body for uploading metadata CSV file"""
    # File is passed separately as form-data
    metadata_source: Optional[str] = Field(None, description="Source identifier for metadata")
    notes: Optional[str] = Field(None, description="Optional notes about this dataset")
    
    class Config:
        schema_extra = {
            "example": {
                "metadata_source": "clinical_trial_123",
                "notes": "Phase 2 trial metadata"
            }
        }


class CreateSessionRequest(BaseModel):
    """Request body for creating a new curation session"""
    metadata_file_id: str = Field(..., description="ID of uploaded metadata file")
    curator_user_id: str = Field(..., description="User ID of curator")
    
    class Config:
        schema_extra = {
            "example": {
                "metadata_file_id": "file_abc123",
                "curator_user_id": "curator_john_doe"
            }
        }


class UpdateFieldMappingRequest(BaseModel):
    """Request body for updating a field mapping"""
    field_id: str = Field(..., description="ID of field to update")
    standardized_field_name: Optional[str] = Field(None, description="Standard field name (null if unmapped)")
    mapping_source: str = Field(..., description="Source of mapping")
    chosen_suggestion_index: Optional[int] = Field(None, description="Index of chosen suggestion (-1 for custom)")
    is_manual_entry: bool = Field(False, description="Was this manually typed?")
    mapping_notes: Optional[str] = Field(None, description="Curator's notes on this mapping")
    
    @validator("mapping_source")
    def validate_source(cls, v):
        valid = ["curator", "curator_manual", "model", "unmapped"]
        if v not in valid:
            raise ValueError(f"mapping_source must be one of {valid}")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "field_id": "field_123",
                "standardized_field_name": "white_blood_count",
                "mapping_source": "curator",
                "chosen_suggestion_index": 0,
                "is_manual_entry": False,
                "mapping_notes": "Selected top suggestion from FTS"
            }
        }


class BatchApproveRequest(BaseModel):
    """Request body for batch approving fields"""
    field_ids: List[str] = Field(..., description="List of field IDs to approve")
    min_confidence: float = Field(0.85, description="Only approve suggestions with confidence >= this value")
    curator_notes: Optional[str] = Field(None, description="Notes for batch approval")
    
    @validator("min_confidence")
    def validate_confidence(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("min_confidence must be between 0.0 and 1.0")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "field_ids": ["field_1", "field_2", "field_3"],
                "min_confidence": 0.85,
                "curator_notes": "Auto-approved high confidence fields"
            }
        }


class GenerateExportRequest(BaseModel):
    """Request body for generating export files"""
    formats: List[str] = Field(["CSV"], description="Export formats to generate")
    include_audit_trail: bool = Field(False, description="Include curator edit history?")
    custom_format_config: Optional[dict] = Field(None, description="Config for custom export")
    
    @validator("formats")
    def validate_formats(cls, v):
        valid_formats = ["CSV", "JSON", "PARQUET", "CUSTOM"]
        for fmt in v:
            if fmt not in valid_formats:
                raise ValueError(f"Invalid format: {fmt}. Must be one of {valid_formats}")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "formats": ["CSV", "JSON"],
                "include_audit_trail": False,
                "custom_format_config": None
            }
        }


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class SuggestionResponse(BaseModel):
    """Response model for a single suggestion"""
    id: str
    field_id: str
    suggested_value: str
    confidence: float
    method: str
    source: str
    explanation: Optional[str]
    rank: int
    
    class Config:
        schema_extra = {
            "example": {
                "id": "sugg_123",
                "field_id": "field_1",
                "suggested_value": "white_blood_count",
                "confidence": 0.95,
                "method": "BiEncoder",
                "source": "NCIT",
                "explanation": "BiEncoder similarity score 0.95 with NCIT concept",
                "rank": 1
            }
        }


class MappingResponse(BaseModel):
    """Response model for field mapping"""
    id: str
    field_id: str
    standardized_field_name: Optional[str]
    mapping_source: str
    chosen_suggestion_index: Optional[int]
    is_manual_entry: bool
    curator_notes: Optional[str]
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    
    class Config:
        schema_extra = {
            "example": {
                "id": "map_123",
                "field_id": "field_1",
                "standardized_field_name": "white_blood_count",
                "mapping_source": "curator",
                "chosen_suggestion_index": 0,
                "is_manual_entry": False,
                "curator_notes": None,
                "approved_at": "2024-03-07T10:30:00",
                "approved_by": "curator_john"
            }
        }


class FieldResponse(BaseModel):
    """Response model for a field with all its data"""
    id: str
    session_id: str
    original_field_name: str
    field_type: Optional[str]
    sample_values: List[Any]
    value_count: Optional[int]
    missing_count: Optional[int]
    is_approved: bool
    is_unmapped: bool
    confidence: float
    suggestions: List[SuggestionResponse]
    mapping: Optional[MappingResponse]
    
    class Config:
        schema_extra = {
            "example": {
                "id": "field_1",
                "session_id": "session_123",
                "original_field_name": "WBC",
                "field_type": "numeric",
                "sample_values": [4.5, 5.2, 6.1],
                "value_count": 1000,
                "missing_count": 5,
                "is_approved": False,
                "is_unmapped": False,
                "confidence": 0.95,
                "suggestions": [],
                "mapping": None
            }
        }


class SessionProgressResponse(BaseModel):
    """Response model for session progress"""
    fields_approved: int
    fields_pending: int
    fields_unmapped: int
    total_fields: int
    progress_percentage: int
    average_confidence: float
    estimated_time_remaining_minutes: Optional[int]
    
    class Config:
        schema_extra = {
            "example": {
                "fields_approved": 45,
                "fields_pending": 30,
                "fields_unmapped": 5,
                "total_fields": 80,
                "progress_percentage": 56,
                "average_confidence": 0.82,
                "estimated_time_remaining_minutes": 15
            }
        }


class SessionResponse(BaseModel):
    """Response model for curation session"""
    id: str
    metadata_file_id: str
    curator_user_id: str
    session_status: str
    created_at: str
    updated_at: str
    total_fields: int
    fields_approved: int
    fields_pending: int
    fields_unmapped: int
    average_confidence: float
    progress_percentage: int
    notes: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "session_123",
                "metadata_file_id": "file_abc",
                "curator_user_id": "curator_john",
                "session_status": "in_progress",
                "created_at": "2024-03-07T09:00:00",
                "updated_at": "2024-03-07T10:30:00",
                "total_fields": 80,
                "fields_approved": 45,
                "fields_pending": 30,
                "fields_unmapped": 5,
                "average_confidence": 0.82,
                "progress_percentage": 56,
                "notes": None
            }
        }


class MetadataFileResponse(BaseModel):
    """Response model for uploaded metadata file"""
    id: str
    filename: str
    field_count: int
    row_count: int
    upload_time: str
    status: str
    metadata_source: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "file_abc123",
                "filename": "clinical_trial_data.csv",
                "field_count": 80,
                "row_count": 500,
                "upload_time": "2024-03-07T09:00:00",
                "status": "processed",
                "metadata_source": "clinical_trial_123"
            }
        }


class ExportResponse(BaseModel):
    """Response model for export file"""
    id: str
    session_id: str
    export_format: str
    file_path: str
    row_count: Optional[int] = None
    file_size_bytes: Optional[int] = None
    generated_at: str
    generated_by: str
    status: str
    error_message: Optional[str] = None
    download_url: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "export_123",
                "session_id": "session_123",
                "export_format": "CSV",
                "file_path": "/exports/export_123.csv",
                "row_count": 500,
                "file_size_bytes": 125000,
                "generated_at": "2024-03-07T10:45:00",
                "generated_by": "curator_john",
                "status": "success",
                "error_message": None,
                "download_url": "/api/exports/export_123/download"
            }
        }


class EditHistoryResponse(BaseModel):
    """Response model for curator edit history"""
    id: str
    session_id: str
    field_id: str
    editor_user_id: str
    action: str
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    change_reason: Optional[str] = None
    edited_at: str
    
    class Config:
        schema_extra = {
            "example": {
                "id": "edit_123",
                "session_id": "session_123",
                "field_id": "field_1",
                "editor_user_id": "curator_john",
                "action": "approve",
                "before_value": None,
                "after_value": "white_blood_count",
                "change_reason": "Selected top suggestion",
                "edited_at": "2024-03-07T10:30:00"
            }
        }


class ErrorResponse(BaseModel):
    """Response model for errors"""
    detail: str
    error_code: str
    status_code: int
    
    class Config:
        schema_extra = {
            "example": {
                "detail": "File not found",
                "error_code": "FILE_NOT_FOUND",
                "status_code": 404
            }
        }


# ============================================================================
# LIST RESPONSE MODELS
# ============================================================================

class SessionListResponse(BaseModel):
    """Response for listing multiple sessions"""
    total: int
    count: int
    sessions: List[SessionResponse]


class FieldListResponse(BaseModel):
    """Response for listing multiple fields"""
    total: int
    count: int
    fields: List[FieldResponse]


class ExportListResponse(BaseModel):
    """Response for listing multiple exports"""
    total: int
    count: int
    exports: List[ExportResponse]


class EditHistoryListResponse(BaseModel):
    """Response for listing edit history"""
    total: int
    count: int
    edits: List[EditHistoryResponse]
