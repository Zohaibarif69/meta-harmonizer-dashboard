"""
Unit tests for curator workflow API endpoints
Run with: pytest backend/test_curator_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile
import os
from io import BytesIO

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def test_db():
    """Create test database"""
    from backend.database import Base, engine, SessionLocal, get_db
    from backend.main import app
    
    Base.metadata.create_all(bind=engine)
    
    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    return SessionLocal()


@pytest.fixture
def client(test_db):
    """Create test client"""
    from backend.main import app
    return TestClient(app)


# ============================================================================
# HEALTH CHECK TESTS
# ============================================================================

def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/api/curator/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "curator_workflow_api"
    assert "timestamp" in data


def test_root_endpoint(client):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "documentation" in data


# ============================================================================
# METADATA UPLOAD TESTS
# ============================================================================

def test_upload_valid_csv(client):
    """Test uploading valid CSV file"""
    csv_content = b"field1,field2,field3\nvalue1,value2,value3\nval1a,val2a,val3a"
    
    response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")},
        params={"metadata_source": "test_source"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "test.csv"
    assert data["field_count"] == 3
    assert data["row_count"] == 2
    assert data["status"] == "processed"
    assert data["metadata_source"] == "test_source"
    assert "id" in data


def test_upload_invalid_file_type(client):
    """Test uploading invalid file type"""
    invalid_content = b"some text content"
    
    response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.txt", BytesIO(invalid_content), "text/plain")}
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "CSV" in data["detail"]


def test_upload_empty_csv(client):
    """Test uploading empty CSV"""
    csv_content = b""
    
    response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("empty.csv", BytesIO(csv_content), "text/csv")}
    )
    
    assert response.status_code == 400


def test_list_metadata_files(client):
    """Test listing uploaded files"""
    # Upload a file first
    csv_content = b"field1,field2\nval1,val2"
    client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test1.csv", BytesIO(csv_content), "text/csv")}
    )
    
    # List files
    response = client.get("/api/curator/metadata/files")
    assert response.status_code == 200
    files = response.json()
    assert isinstance(files, list)
    assert len(files) > 0
    assert files[0]["filename"] == "test1.csv"


def test_get_metadata_file(client):
    """Test getting specific metadata file"""
    # Upload file
    csv_content = b"field1\nvalue1"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    # Get file
    response = client.get(f"/api/curator/metadata/files/{file_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == file_id
    assert data["filename"] == "test.csv"


def test_get_nonexistent_file(client):
    """Test getting non-existent file"""
    response = client.get("/api/curator/metadata/files/nonexistent_id")
    assert response.status_code == 404


# ============================================================================
# CURATION SESSION TESTS
# ============================================================================

def test_create_session(client):
    """Test creating curation session"""
    # First upload a file
    csv_content = b"field1,field2,field3\nval1,val2,val3"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    # Create session
    response = client.post(
        "/api/curator/sessions",
        json={
            "metadata_file_id": file_id,
            "curator_user_id": "test_curator"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["metadata_file_id"] == file_id
    assert data["curator_user_id"] == "test_curator"
    assert data["session_status"] == "created"
    assert data["total_fields"] == 3
    assert "id" in data


def test_create_session_invalid_file(client):
    """Test creating session with invalid file ID"""
    response = client.post(
        "/api/curator/sessions",
        json={
            "metadata_file_id": "nonexistent_file",
            "curator_user_id": "test_curator"
        }
    )
    
    assert response.status_code == 404


def test_get_session(client):
    """Test getting session details"""
    # Create session first
    csv_content = b"field1,field2\nval1,val2"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    session_response = client.post(
        "/api/curator/sessions",
        json={"metadata_file_id": file_id, "curator_user_id": "curator1"}
    )
    session_id = session_response.json()["id"]
    
    # Get session
    response = client.get(f"/api/curator/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session_id


def test_get_session_progress(client):
    """Test getting session progress"""
    # Create session
    csv_content = b"field1,field2\nval1,val2"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    session_response = client.post(
        "/api/curator/sessions",
        json={"metadata_file_id": file_id, "curator_user_id": "curator1"}
    )
    session_id = session_response.json()["id"]
    
    # Get progress
    response = client.get(f"/api/curator/sessions/{session_id}/progress")
    assert response.status_code == 200
    data = response.json()
    assert "fields_approved" in data
    assert "fields_pending" in data
    assert "fields_unmapped" in data
    assert "total_fields" in data
    assert "progress_percentage" in data


# ============================================================================
# FIELD OPERATIONS TESTS
# ============================================================================

def test_get_field_details(client):
    """Test getting field details"""
    # Setup: Create session with fields
    csv_content = b"field1,field2\nval1,val2"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    session_response = client.post(
        "/api/curator/sessions",
        json={"metadata_file_id": file_id, "curator_user_id": "curator1"}
    )
    session_data = session_response.json()
    
    # List fields in session
    response = client.get(f"/api/curator/sessions/{session_data['id']}/fields")
    assert response.status_code == 200
    
    fields = response.json()
    assert len(fields) > 0
    
    # Get first field
    field_response = client.get(f"/api/curator/fields/{fields[0]['id']}")
    assert field_response.status_code == 200


def test_list_session_fields(client):
    """Test listing fields in session"""
    # Setup
    csv_content = b"field1,field2,field3\nval1,val2,val3"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    session_response = client.post(
        "/api/curator/sessions",
        json={"metadata_file_id": file_id, "curator_user_id": "curator1"}
    )
    session_id = session_response.json()["id"]
    
    # List fields
    response = client.get(f"/api/curator/sessions/{session_id}/fields?skip=0&limit=10")
    assert response.status_code == 200
    fields = response.json()
    assert isinstance(fields, list)


# ============================================================================
# EXPORT TESTS
# ============================================================================

def test_generate_exports(client):
    """Test generating export files"""
    # Setup
    csv_content = b"field1,field2\nval1,val2"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    session_response = client.post(
        "/api/curator/sessions",
        json={"metadata_file_id": file_id, "curator_user_id": "curator1"}
    )
    session_id = session_response.json()["id"]
    
    # Generate exports
    response = client.post(
        f"/api/curator/sessions/{session_id}/export",
        json={"formats": ["CSV", "JSON"]},
        params={"curator_user_id": "curator1"}
    )
    
    assert response.status_code == 201
    exports = response.json()
    assert isinstance(exports, list)
    assert len(exports) == 2


def test_get_edit_history(client):
    """Test getting edit history"""
    # Setup
    csv_content = b"field1\nval1"
    upload_response = client.post(
        "/api/curator/metadata/upload",
        files={"file": ("test.csv", BytesIO(csv_content), "text/csv")}
    )
    file_id = upload_response.json()["id"]
    
    session_response = client.post(
        "/api/curator/sessions",
        json={"metadata_file_id": file_id, "curator_user_id": "curator1"}
    )
    session_id = session_response.json()["id"]
    
    # Get edit history
    response = client.get(f"/api/curator/sessions/{session_id}/edits")
    assert response.status_code == 200
    edits = response.json()
    assert isinstance(edits, list)
