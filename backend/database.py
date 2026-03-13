"""
SQLAlchemy ORM Models for Curator Workflow
Database: SQLite
"""

from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, JSON, Boolean, ForeignKey, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import json

# Database configuration
DATABASE_URL = "sqlite:///./curator_workflow.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================================================
# ENUMS
# ============================================================================

class SessionStatus(str, enum.Enum):
    """Curation session status"""
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class MappingSource(str, enum.Enum):
    """Source of field mapping"""
    CURATOR = "curator"
    CURATOR_MANUAL = "curator_manual"
    MODEL = "model"
    UNMAPPED = "unmapped"


class EditAction(str, enum.Enum):
    """Type of curator edit action"""
    APPROVE = "approve"
    REJECT = "reject"
    MARK_UNMAPPED = "mark_unmapped"
    REVERT = "revert"
    BULK_APPROVE = "bulk_approve"


class ExportFormat(str, enum.Enum):
    """Export file format"""
    CSV = "CSV"
    JSON = "JSON"
    PARQUET = "PARQUET"
    CUSTOM = "CUSTOM"


# ============================================================================
# DATABASE MODELS
# ============================================================================

class MetadataFile(Base):
    """
    Uploaded metadata CSV files
    Stores information about input files
    """
    __tablename__ = "metadata_files"
    
    id = Column(String(50), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_path = Column(String(500), nullable=True)
    field_count = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    upload_time = Column(DateTime, default=datetime.utcnow, index=True)
    file_hash = Column(String(64), nullable=True)  # SHA256 hash for deduplication
    status = Column(String(20), default="uploaded")  # uploaded, processed, error
    metadata_source = Column(String(100), nullable=True)  # e.g., "clinical_trial_123"
    
    # Relationships
    sessions = relationship("CurationSession", back_populates="metadata_file")
    
    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "field_count": self.field_count,
            "row_count": self.row_count,
            "upload_time": self.upload_time.isoformat() if self.upload_time else None,
            "status": self.status,
            "metadata_source": self.metadata_source
        }


class CurationSession(Base):
    """
    Curation session - represents one curator's work on one metadata file
    Tracks overall progress and session state
    """
    __tablename__ = "curation_sessions"
    
    id = Column(String(50), primary_key=True, index=True)
    metadata_file_id = Column(String(50), ForeignKey("metadata_files.id"), index=True)
    curator_user_id = Column(String(100), nullable=False, index=True)
    session_status = Column(String(20), default=SessionStatus.CREATED)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    total_fields = Column(Integer, default=0)
    fields_approved = Column(Integer, default=0)
    fields_pending = Column(Integer, default=0)
    fields_unmapped = Column(Integer, default=0)
    average_confidence = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    # Relationships
    metadata_file = relationship("MetadataFile", back_populates="sessions")
    fields = relationship("Field", back_populates="session", cascade="all, delete-orphan")
    edits = relationship("CuratorEdit", back_populates="session", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="session", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "metadata_file_id": self.metadata_file_id,
            "curator_user_id": self.curator_user_id,
            "session_status": self.session_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "total_fields": self.total_fields,
            "fields_approved": self.fields_approved,
            "fields_pending": self.fields_pending,
            "fields_unmapped": self.fields_unmapped,
            "average_confidence": round(self.average_confidence, 3),
            "progress_percentage": int((self.fields_approved / self.total_fields * 100) if self.total_fields > 0 else 0),
            "notes": self.notes
        }


class Field(Base):
    """
    Individual fields from metadata CSV
    Tracks field status and curation progress
    """
    __tablename__ = "fields"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("curation_sessions.id"), index=True)
    original_field_name = Column(String(255), nullable=False)
    field_type = Column(String(50), nullable=True)  # numeric, categorical, text, datetime, etc.
    sample_values = Column(JSON, nullable=True)  # Array of sample values from data
    value_count = Column(Integer, nullable=True)  # Number of unique values
    missing_count = Column(Integer, nullable=True)  # Number of NULL values
    is_approved = Column(Boolean, default=False, index=True)
    is_unmapped = Column(Boolean, default=False, index=True)
    confidence = Column(Float, default=0.0)  # Confidence of top suggestion
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("CurationSession", back_populates="fields")
    suggestions = relationship("FieldSuggestion", back_populates="field", cascade="all, delete-orphan")
    mapping = relationship("FieldMapping", back_populates="field", uselist=False, cascade="all, delete-orphan")
    edit_history = relationship("CuratorEdit", back_populates="field", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "original_field_name": self.original_field_name,
            "field_type": self.field_type,
            "sample_values": self.sample_values or [],
            "value_count": self.value_count,
            "missing_count": self.missing_count,
            "is_approved": self.is_approved,
            "is_unmapped": self.is_unmapped,
            "confidence": round(self.confidence, 3),
            "suggestions": [s.to_dict() for s in self.suggestions] if self.suggestions else [],
            "mapping": self.mapping.to_dict() if self.mapping else None
        }


class FieldSuggestion(Base):
    """
    Automated suggestions for field mapping
    Generated by SchemaMapEngine with confidence scores
    """
    __tablename__ = "field_suggestions"
    
    id = Column(String(50), primary_key=True, index=True)
    field_id = Column(String(50), ForeignKey("fields.id"), index=True)
    suggested_value = Column(String(255), nullable=False)
    confidence = Column(Float, nullable=False)  # 0.0 to 1.0
    method = Column(String(50), nullable=False)  # FTS, BiEncoder, RAG, Synonym, LM, etc.
    source = Column(String(50), nullable=False)  # NCIT, UMLS, SNOMED, Custom, etc.
    explanation = Column(Text, nullable=True)  # Why this suggestion was chosen
    rank = Column(Integer, nullable=False)  # 1, 2, 3... (ranked by confidence)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    field = relationship("Field", back_populates="suggestions")
    
    def to_dict(self):
        return {
            "id": self.id,
            "field_id": self.field_id,
            "suggested_value": self.suggested_value,
            "confidence": round(self.confidence, 3),
            "method": self.method,
            "source": self.source,
            "explanation": self.explanation,
            "rank": self.rank
        }


class FieldMapping(Base):
    """
    Final curator-approved field mapping
    Stores the curator's decision for each field
    """
    __tablename__ = "field_mappings"
    
    id = Column(String(50), primary_key=True, index=True)
    field_id = Column(String(50), ForeignKey("fields.id"), unique=True, index=True)
    standardized_field_name = Column(String(255), nullable=True)  # NULL if unmapped
    mapping_source = Column(String(50), nullable=False)  # curator, curator_manual, model, unmapped
    chosen_suggestion_index = Column(Integer, nullable=True)  # Which suggestion was chosen (-1 for custom)
    is_manual_entry = Column(Boolean, default=False)  # Was this manually typed?
    curator_notes = Column(Text, nullable=True)  # Why did curator choose this?
    approved_at = Column(DateTime, nullable=True)  # When was it approved?
    approved_by = Column(String(100), nullable=True)  # Who approved it?
    
    # Relationships
    field = relationship("Field", back_populates="mapping")
    
    def to_dict(self):
        return {
            "id": self.id,
            "field_id": self.field_id,
            "standardized_field_name": self.standardized_field_name,
            "mapping_source": self.mapping_source,
            "chosen_suggestion_index": self.chosen_suggestion_index,
            "is_manual_entry": self.is_manual_entry,
            "curator_notes": self.curator_notes,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "approved_by": self.approved_by
        }


class CuratorEdit(Base):
    """
    Audit trail - immutable log of all curator actions
    Never update, only insert
    """
    __tablename__ = "curator_edits"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("curation_sessions.id"), index=True)
    field_id = Column(String(50), ForeignKey("fields.id"), index=True)
    editor_user_id = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)  # approve, reject, mark_unmapped, etc.
    before_value = Column(String(255), nullable=True)  # Previous value
    after_value = Column(String(255), nullable=True)  # New value
    change_reason = Column(Text, nullable=True)  # Why did curator make this change?
    edited_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    session = relationship("CurationSession", back_populates="edits")
    field = relationship("Field", back_populates="edit_history")
    
    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "field_id": self.field_id,
            "editor_user_id": self.editor_user_id,
            "action": self.action,
            "before_value": self.before_value,
            "after_value": self.after_value,
            "change_reason": self.change_reason,
            "edited_at": self.edited_at.isoformat() if self.edited_at else None
        }


class Export(Base):
    """
    Generated export files
    Tracks which files were exported when
    """
    __tablename__ = "exports"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("curation_sessions.id"), index=True)
    export_format = Column(String(50), nullable=False)  # CSV, JSON, Parquet, Custom
    file_path = Column(String(500), nullable=False)
    row_count = Column(Integer, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)
    generated_by = Column(String(100), nullable=False)
    status = Column(String(20), default="success")  # success, error, partial
    error_message = Column(Text, nullable=True)
    
    # Relationships
    session = relationship("CurationSession", back_populates="exports")
    
    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "export_format": self.export_format,
            "file_path": self.file_path,
            "row_count": self.row_count,
            "file_size_bytes": self.file_size_bytes,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "generated_by": self.generated_by,
            "status": self.status
        }


# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def init_db():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized successfully")


def get_db():
    """Dependency for FastAPI to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
