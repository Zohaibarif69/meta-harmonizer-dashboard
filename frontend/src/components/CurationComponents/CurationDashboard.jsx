/**
 * CurationDashboard Component
 * Main coordinator for the curator workflow interface
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useCurationSession from '../../hooks/useCurationSession';
import useFieldNavigation from '../../hooks/useFieldNavigation';
import SessionHeader from './SessionHeader';
import FieldList from './FieldList';
import FieldEditor from './FieldEditor';
import RightSidebar from './RightSidebar';
import CurationProgress from './CurationProgress';
import ExportModal from './ExportModal';
import './CurationDashboard.css';

const CurationDashboard = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const {
    session,
    fields,
    currentField,
    loading,
    error,
    selectField,
    updateFieldMapping,
    getProgress,
    generateExports,
    bulkApproveFields,
  } = useCurationSession(sessionId);

  const { currentIndex, nextField, previousField, hasNext, hasPrevious } =
    useFieldNavigation(fields, currentField?.id);

  const [showProgress, setShowProgress] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(0.85);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-refresh progress every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionId) {
        getProgress();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId, getProgress]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAutoApprove = async () => {
    if (!fields) return;

    try {
      setIsSaving(true);
      const highConfidenceFields = fields
        .filter(f => f.confidence >= autoApproveThreshold && !f.is_approved)
        .map(f => f.id);

      if (highConfidenceFields.length === 0) {
        setSuccessMessage('No fields with sufficient confidence found');
        return;
      }

      await bulkApproveFields(
        highConfidenceFields,
        autoApproveThreshold
      );

      setSuccessMessage(
        `✓ Auto-approved ${highConfidenceFields.length} fields`
      );
    } catch (err) {
      console.error('Error auto-approving:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportClick = async () => {
    setShowExportModal(true);
  };

  const handleFieldSelect = async (fieldId) => {
    try {
      selectField(fieldId);
    } catch (err) {
      console.error('Error selecting field:', err);
    }
  };

  const handleFieldUpdate = async (mappingData) => {
    try {
      setIsSaving(true);
      await updateFieldMapping(mappingData);
      setSuccessMessage('✓ Field mapping updated');

      // Move to next field
      if (hasNext) {
        const next = fields[currentIndex + 1];
        if (next) {
          handleFieldSelect(next.id);
        }
      }
    } catch (err) {
      console.error('Error updating field:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="curation-dashboard loading" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Loading Session</h2>
          <p style={{ color: '#666' }}>Please wait while we load your curation session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="curation-dashboard error" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'white',
        padding: '40px'
      }}>
        <div style={{ 
          maxWidth: '500px',
          textAlign: 'center',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '30px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#991b1b' }}>Error Loading Session</h2>
          <p style={{ color: '#7f1d1d', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </p>
          <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '13px' }}>
            This usually means the session ID is invalid or the API is not responding.
          </p>
          <button
            onClick={() => navigate('/upload')}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              marginRight: '10px'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Create New Session
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.background = '#4b5563'}
            onMouseOut={(e) => e.target.style.background = '#6b7280'}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!session || !fields) {
    return (
      <div className="curation-dashboard empty" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'white',
        padding: '40px'
      }}>
        <div style={{ 
          maxWidth: '500px',
          textAlign: 'center',
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '30px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#374151' }}>No Session Data</h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            The session data could not be loaded. This might be a temporary issue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              marginRight: '10px'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/upload')}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.background = '#4b5563'}
            onMouseOut={(e) => e.target.style.background = '#6b7280'}
          >
            Create New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="curation-dashboard">
      {successMessage && (
        <div className="success-notification">{successMessage}</div>
      )}

      <SessionHeader
        session={session}
        onShowProgress={() => setShowProgress(true)}
        onShowExport={handleExportClick}
      />

      <div className="curation-content">
        <FieldList
          fields={fields}
          currentFieldId={currentField?.id}
          onSelectField={handleFieldSelect}
        />

        <FieldEditor
          field={currentField}
          sessionId={sessionId}
          onUpdate={handleFieldUpdate}
          onNext={() => nextField()}
          onPrevious={() => previousField()}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          isSaving={isSaving}
        />

        <RightSidebar
          currentIndex={currentIndex}
          totalFields={fields.length}
          onAutoApprove={handleAutoApprove}
          autoApproveThreshold={autoApproveThreshold}
          setAutoApproveThreshold={setAutoApproveThreshold}
          isLoading={isSaving}
        />
      </div>

      {showProgress && (
        <CurationProgress
          sessionId={sessionId}
          onClose={() => setShowProgress(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          sessionId={sessionId}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default CurationDashboard;
