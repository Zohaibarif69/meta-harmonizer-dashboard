/**
 * SessionCreator Component
 * File upload and session creation workflow
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as curatorService from '../services/curatorService';

const SessionCreator = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // Load recent files on mount
  React.useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        const files = await curatorService.listMetadataFiles();
        setRecentFiles(files || []);
      } catch (err) {
        console.error('Error loading files:', err);
      } finally {
        setIsLoadingFiles(false);
      }
    };
    loadRecentFiles();
  }, []);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Verify it's a CSV
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Upload the file
      const metadata = await curatorService.uploadMetadataFile(file);
      setProgress(50);

      // Create a curation session with a default curator user
      const session = await curatorService.createCurationSession(
        metadata.id,
        'anonymous_curator' // Default curator user ID
      );
      setProgress(100);

      // Navigate to the curator
      setTimeout(() => {
        navigate(`/curator/${session.id}`);
      }, 500);
    } catch (err) {
      // Extract meaningful error message
      let errorMessage = 'Upload failed';
      if (err.message) {
        errorMessage = `${errorMessage}: ${err.message}`;
      } else if (err.data?.detail) {
        errorMessage = `${errorMessage}: ${err.data.detail}`;
      } else if (typeof err === 'string') {
        errorMessage = `${errorMessage}: ${err}`;
      }
      
      setError(errorMessage);
      setProgress(0);
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateSessionFromExisting = async (fileId) => {
    try {
      const session = await curatorService.createCurationSession(
        fileId,
        'anonymous_curator' // Default curator user ID
      );
      navigate(`/curator/${session.id}`);
    } catch (err) {
      let errorMessage = 'Failed to create session';
      if (err.message) {
        errorMessage = `${errorMessage}: ${err.message}`;
      } else if (err.data?.detail) {
        errorMessage = `${errorMessage}: ${err.data.detail}`;
      }
      setError(errorMessage);
      console.error('Session creation error:', {
        error: err,
        message: err.message,
        data: err.data,
        status: err.status
      });
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'system-ui'
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Upload Metadata</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Upload a CSV file to start curating your metadata fields.
      </p>

      {/* Error message */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '6px',
          borderLeft: '4px solid #ef4444',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Upload section */}
      <div style={{
        background: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '8px',
        padding: '32px',
        textAlign: 'center',
        marginBottom: '30px',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        opacity: isUploading ? 0.6 : 1
      }}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isUploading}
          style={{ display: 'none' }}
          id="file-input"
        />

        <label
          htmlFor="file-input"
          style={{
            display: 'block',
            cursor: isUploading ? 'not-allowed' : 'pointer'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📁</div>
          <p style={{
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#1f2937'
          }}>
            {file ? file.name : 'Drag and drop your CSV file here'}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            or click to select
          </p>
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
            CSV files only • Maximum 100MB
          </p>
        </label>
      </div>

      {/* Progress bar */}
      {isUploading && progress > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            height: '8px',
            background: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, #2563eb, #1d4ed8)`,
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {progress}% complete...
          </p>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: !file || isUploading ? '#d1d5db' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: !file || isUploading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
        onMouseOver={(e) => !file || isUploading ? null : (e.target.style.background = '#1d4ed8')}
        onMouseOut={(e) => !file || isUploading ? null : (e.target.style.background = '#2563eb')}
      >
        {isUploading ? 'Uploading...' : 'Create Session'}
      </button>

      {/* Recent files section */}
      {recentFiles && recentFiles.length > 0 && (
        <div style={{
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '30px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginTop: 0, marginBottom: '12px' }}>
            Recent Files
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
            Or continue with a previously uploaded file:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => handleCreateSessionFromExisting(file.id)}
                style={{
                  padding: '12px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f0f9ff';
                  e.currentTarget.style.borderColor = '#bfdbfe';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0' }}>
                      {file.filename || `File ${file.id}`}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {file.field_count || file.total_fields} fields • Uploaded {file.upload_time ? new Date(file.upload_time).toLocaleDateString() : 'Unknown Date'}
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state for recent files */}
      {isLoadingFiles && (
        <div style={{
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
          marginTop: '30px'
        }}>
          Loading recent files...
        </div>
      )}
    </div>
  );
};

export default SessionCreator;
