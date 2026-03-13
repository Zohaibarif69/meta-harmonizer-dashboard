"""
FastAPI router for curator workflow endpoints
"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
import csv
import json
import uuid
import logging
from typing import List, Optional
import hashlib
import os

from . import database, schemas

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/curator", tags=["curator"])

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_id(prefix: str) -> str:
    """Generate unique ID with prefix"""
    unique = str(uuid.uuid4())[:8]
    return f"{prefix}_{unique}"


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()


async def parse_csv_file(file: UploadFile) -> tuple[bytes, List[str], List[dict], int]:
    """
    Parse CSV file and return content, columns, rows, and validation status
    Returns: (content, column_names, sample_rows, total_rows)
    """
    content = await file.read()
    text = content.decode('utf-8')
    lines = text.strip().split('\n')
    
    reader = csv.DictReader(lines)
    rows = list(reader)
    
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty"
        )
    
    column_names = list(rows[0].keys())
    sample_rows = rows[:5]  # First 5 rows as sample
    total_rows = len(rows)
    
    return content, column_names, sample_rows, total_rows


def _generate_mapper_suggestions(
    field_name: str,
    sample_values: List[str],
    db: Session
) -> List[database.FieldSuggestion]:
    """
    Call SchemaMapEngine to generate suggestions for a field
    
    Note: This is a stub that should be replaced with actual SchemaMapEngine integration
    """
    # TODO: Integrate with existing SchemaMapEngine from src/Engine/ontology_mapping_engine.py
    
    suggestions = []
    
    # Stub: Return a single suggestion
    sugg = database.FieldSuggestion(
        id=generate_id("sugg"),
        suggested_value=field_name.lower().replace(" ", "_"),
        confidence=0.75,
        method="stub",
        source="schema_map_engine",
        explanation="Stub suggestion - integrate with SchemaMapEngine",
        rank=1
    )
    suggestions.append(sugg)
    
    return suggestions


def _estimate_curation_time(total_fields: int, avg_time_per_field_seconds: int = 30) -> int:
    """Estimate remaining curation time in minutes"""
    # Assuming 30 seconds per field on average
    remaining_seconds = total_fields * avg_time_per_field_seconds
    return max(1, remaining_seconds // 60)


# ============================================================================
# METADATA ENDPOINTS
# ============================================================================

@router.post("/metadata/upload", response_model=schemas.MetadataFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_metadata(
    file: UploadFile = File(...),
    metadata_source: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    """
    Upload metadata CSV file and store in database
    
    Returns: MetadataFileResponse with file ID
    
    Example:
        curl -X POST "http://localhost:8000/api/curator/metadata/upload" \\
             -F "file=@mydata.csv" \\
             -F "metadata_source=clinical_trial_123"
    """
    try:
        logger.info(f"Uploading file: {file.filename}")
        
        # Validate file extension
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be CSV format"
            )
        
        # Parse CSV and get content
        content, column_names, sample_rows, total_rows = await parse_csv_file(file)
        
        # Calculate file hash from content
        file_hash = calculate_file_hash(content)
        
        # Check for duplicate
        existing = db.query(database.MetadataFile).filter(
            database.MetadataFile.file_hash == file_hash
        ).first()
        
        if existing:
            logger.warning(f"Duplicate file detected: {file_hash}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"File already uploaded with ID: {existing.id}"
            )
        
        # Create MetadataFile record
        file_id = generate_id("file")
        metadata_file = database.MetadataFile(
            id=file_id,
            filename=file.filename,
            field_count=len(column_names),
            row_count=total_rows,
            file_hash=file_hash,
            status="processed",
            metadata_source=metadata_source
        )
        
        db.add(metadata_file)
        db.commit()
        db.refresh(metadata_file)
        
        logger.info(f"✓ File uploaded: {file_id}")
        return metadata_file.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@router.get("/metadata/files", response_model=List[schemas.MetadataFileResponse])
async def list_metadata_files(
    db: Session = Depends(database.get_db)
):
    """List all uploaded metadata files"""
    files = db.query(database.MetadataFile).order_by(
        desc(database.MetadataFile.upload_time)
    ).all()
    
    return [f.to_dict() for f in files]


@router.get("/metadata/files/{file_id}", response_model=schemas.MetadataFileResponse)
async def get_metadata_file(
    file_id: str,
    db: Session = Depends(database.get_db)
):
    """Get specific metadata file details"""
    file = db.query(database.MetadataFile).filter(
        database.MetadataFile.id == file_id
    ).first()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file.to_dict()


# ============================================================================
# CURATION SESSION ENDPOINTS
# ============================================================================

@router.post("/sessions", response_model=schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_curation_session(
    request: schemas.CreateSessionRequest,
    db: Session = Depends(database.get_db)
):
    """
    Create new curation session and generate suggestions
    
    Process:
    1. Validate metadata file exists
    2. Create curation session
    3. Fetch file data and create Field records
    4. Call SchemaMapEngine to generate suggestions
    5. Store suggestions in database
    
    Returns: SessionResponse with session ID
    """
    try:
        logger.info(f"Creating session for file: {request.metadata_file_id}")
        
        # Validate metadata file exists
        metadata_file = db.query(database.MetadataFile).filter(
            database.MetadataFile.id == request.metadata_file_id
        ).first()
        
        if not metadata_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Metadata file not found"
            )
        
        # Create session
        session_id = generate_id("session")
        session = database.CurationSession(
            id=session_id,
            metadata_file_id=request.metadata_file_id,
            curator_user_id=request.curator_user_id,
            session_status=database.SessionStatus.CREATED,
            total_fields=metadata_file.field_count,
            started_at=datetime.utcnow()
        )
        
        db.add(session)
        db.flush()
        
        # TODO: Read actual CSV file and create Field records
        # For now, create stub fields
        for i in range(min(metadata_file.field_count, 5)):  # Limit for demo
            field = database.Field(
                id=generate_id("field"),
                session_id=session_id,
                original_field_name=f"field_{i+1}",
                field_type="unknown",
                sample_values=["value1", "value2", "value3"],
                confidence=0.75
            )
            db.add(field)
        
        db.commit()
        db.refresh(session)
        
        logger.info(f"✓ Session created: {session_id}")
        return session.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating session: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=schemas.SessionResponse)
async def get_curation_session(
    session_id: str,
    db: Session = Depends(database.get_db)
):
    """Get curation session details"""
    session = db.query(database.CurationSession).filter(
        database.CurationSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session.to_dict()


@router.get("/sessions/{session_id}/progress", response_model=schemas.SessionProgressResponse)
async def get_session_progress(
    session_id: str,
    db: Session = Depends(database.get_db)
):
    """Get real-time progress of curation session"""
    session = db.query(database.CurationSession).filter(
        database.CurationSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Recalculate from database
    total = session.total_fields
    approved = db.query(func.count(database.Field.id)).filter(
        database.Field.session_id == session_id,
        database.Field.is_approved == True
    ).scalar() or 0
    
    unmapped = db.query(func.count(database.Field.id)).filter(
        database.Field.session_id == session_id,
        database.Field.is_unmapped == True
    ).scalar() or 0
    
    pending = total - approved - unmapped
    
    avg_confidence = db.query(func.avg(database.Field.confidence)).filter(
        database.Field.session_id == session_id
    ).scalar() or 0.0
    
    progress_pct = int((approved / total * 100) if total > 0 else 0)
    estimated_time = _estimate_curation_time(pending)
    
    return {
        "fields_approved": approved,
        "fields_pending": pending,
        "fields_unmapped": unmapped,
        "total_fields": total,
        "progress_percentage": progress_pct,
        "average_confidence": float(avg_confidence),
        "estimated_time_remaining_minutes": estimated_time
    }


# ============================================================================
# FIELD OPERATIONS ENDPOINTS
# ============================================================================

@router.get("/fields/{field_id}", response_model=schemas.FieldResponse)
async def get_field_details(
    field_id: str,
    db: Session = Depends(database.get_db)
):
    """Get field details including suggestions and mapping"""
    field = db.query(database.Field).filter(
        database.Field.id == field_id
    ).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )
    
    return field.to_dict()


@router.put("/fields/{field_id}", response_model=schemas.FieldResponse)
async def update_field_mapping(
    field_id: str,
    request: schemas.UpdateFieldMappingRequest,
    curator_user_id: str = Query(..., description="Curator user ID"),
    db: Session = Depends(database.get_db)
):
    """
    Update field mapping with curator's decision
    
    Note: This creates an immutable audit trail entry
    """
    try:
        # Fetch field
        field = db.query(database.Field).filter(
            database.Field.id == field_id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found"
            )
        
        # Create or update mapping
        mapping = field.mapping
        if not mapping:
            mapping = database.FieldMapping(
                id=generate_id("map"),
                field_id=field_id
            )
        
        # Store before value for audit
        before_value = mapping.standardized_field_name
        
        # Update mapping
        mapping.standardized_field_name = request.standardized_field_name
        mapping.mapping_source = request.mapping_source
        mapping.chosen_suggestion_index = request.chosen_suggestion_index
        mapping.is_manual_entry = request.is_manual_entry
        mapping.curator_notes = request.mapping_notes
        mapping.approved_at = datetime.utcnow()
        mapping.approved_by = curator_user_id
        
        if not field.mapping:
            db.add(mapping)
        
        # Update field status
        field.is_approved = request.mapping_source != "unmapped"
        field.is_unmapped = request.mapping_source == "unmapped"
        
        db.flush()
        
        # Create audit trail entry
        edit = database.CuratorEdit(
            id=generate_id("edit"),
            session_id=field.session_id,
            field_id=field_id,
            editor_user_id=curator_user_id,
            action="approve",
            before_value=before_value,
            after_value=request.standardized_field_name,
            change_reason=request.mapping_notes
        )
        db.add(edit)
        
        db.commit()
        db.refresh(field)
        
        logger.info(f"✓ Field updated: {field_id}")
        return field.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating field: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating field: {str(e)}"
        )


@router.get("/sessions/{session_id}/fields", response_model=List[schemas.FieldResponse])
async def list_session_fields(
    session_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by status: approved, pending, unmapped"),
    db: Session = Depends(database.get_db)
):
    """
    List all fields in a session with pagination and filtering
    """
    query = db.query(database.Field).filter(
        database.Field.session_id == session_id
    )
    
    # Apply status filter
    if status_filter == "approved":
        query = query.filter(database.Field.is_approved == True)
    elif status_filter == "pending":
        query = query.filter(
            (database.Field.is_approved == False) &
            (database.Field.is_unmapped == False)
        )
    elif status_filter == "unmapped":
        query = query.filter(database.Field.is_unmapped == True)
    
    fields = query.offset(skip).limit(limit).all()
    
    return [f.to_dict() for f in fields]


@router.post("/sessions/{session_id}/bulk-approve", response_model=dict)
async def bulk_approve_fields(
    session_id: str,
    request: schemas.BatchApproveRequest,
    curator_user_id: str = Query(..., description="Curator user ID"),
    db: Session = Depends(database.get_db)
):
    """
    Bulk approve fields based on confidence threshold or field ID list
    """
    try:
        logger.info(f"Bulk approving fields in session: {session_id}")
        
        # Validate session exists
        session = db.query(database.CurationSession).filter(
            database.CurationSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Get fields to approve
        if request.field_ids:
            fields = db.query(database.Field).filter(
                database.Field.id.in_(request.field_ids),
                database.Field.session_id == session_id
            ).all()
        else:
            # If no specific IDs, approve by confidence threshold
            fields = db.query(database.Field).filter(
                database.Field.session_id == session_id,
                database.Field.confidence >= request.min_confidence,
                database.Field.is_approved == False
            ).all()
        
        approved_count = 0
        
        for field in fields:
            if not field.is_approved:
                # Create mapping if not exists
                if not field.mapping:
                    mapping = database.FieldMapping(
                        id=generate_id("map"),
                        field_id=field.id,
                        standardized_field_name=field.suggestions[0].suggested_value if field.suggestions else None,
                        mapping_source="curator",
                        chosen_suggestion_index=0
                    )
                    db.add(mapping)
                
                field.is_approved = True
                
                # Create audit entry
                edit = database.CuratorEdit(
                    id=generate_id("edit"),
                    session_id=session_id,
                    field_id=field.id,
                    editor_user_id=curator_user_id,
                    action="bulk_approve",
                    after_value=field.suggestions[0].suggested_value if field.suggestions else None,
                    change_reason=request.curator_notes
                )
                db.add(edit)
                approved_count += 1
        
        db.commit()
        
        logger.info(f"✓ Bulk approved {approved_count} fields")
        return {
            "session_id": session_id,
            "fields_approved": approved_count,
            "message": f"Successfully approved {approved_count} fields"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk approving: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during bulk approval: {str(e)}"
        )


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@router.post("/sessions/{session_id}/export", response_model=List[schemas.ExportResponse], status_code=status.HTTP_201_CREATED)
async def generate_exports(
    session_id: str,
    request: schemas.GenerateExportRequest,
    curator_user_id: str = Query(..., description="Curator user ID"),
    db: Session = Depends(database.get_db)
):
    """
    Generate export files in requested formats
    
    Formats: CSV, JSON, PARQUET, CUSTOM
    """
    try:
        logger.info(f"Generating exports for session: {session_id}")
        
        # Validate session
        session = db.query(database.CurationSession).filter(
            database.CurationSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        exports = []
        
        # Generate each requested format
        for fmt in request.formats:
            export_id = generate_id("export")
            file_path = f"/exports/{export_id}.{fmt.lower()}"
            
            # Create export record
            export = database.Export(
                id=export_id,
                session_id=session_id,
                export_format=fmt,
                file_path=file_path,
                row_count=0,  # TODO: Count actual rows
                generated_at=datetime.utcnow(),
                generated_by=curator_user_id,
                status="success"
            )
            
            db.add(export)
            exports.append(export)
        
        db.commit()
        
        logger.info(f"✓ Generated {len(exports)} exports")
        return [e.to_dict() for e in exports]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating exports: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating exports: {str(e)}"
        )


@router.get("/sessions/{session_id}/edits", response_model=List[schemas.EditHistoryResponse])
async def get_session_edit_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(database.get_db)
):
    """Get audit trail of all curator edits in session"""
    edits = db.query(database.CuratorEdit).filter(
        database.CuratorEdit.session_id == session_id
    ).order_by(desc(database.CuratorEdit.edited_at)).limit(limit).all()
    
    return [e.to_dict() for e in edits]


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "curator_workflow_api",
        "timestamp": datetime.utcnow().isoformat()
    }
