/**
 * CurationProgress Component
 * Modal showing real-time curation progress and statistics
 */

import React, { useEffect, useState } from 'react';
import curatorService from '../../services/curatorService';

const CurationProgress = ({ sessionId, onClose }) => {
  const [progress, setProgress] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prog = await curatorService.getSessionProgress(sessionId);
        const history = await curatorService.getSessionEditHistory(sessionId, 10);
        
        setProgress(prog);
        setEditHistory(history);
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading || !progress) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <p>Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Curation Progress</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Overall Progress */}
          <div className="progress-section">
            <h3>Overall Progress</h3>
            <div className="progress-bar-large">
              <div
                className="progress-fill"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
            <p className="progress-text">
              {progress.fields_approved}/{progress.total_fields} fields
              ({progress.progress_percentage}%)
            </p>
          </div>

          {/* Status Breakdown */}
          <div className="status-breakdown">
            <h3>Status Breakdown</h3>
            <div className="status-row approved">
              <span className="label">✓ Approved by Curator</span>
              <span className="value">
                {progress.fields_approved} fields
                {progress.total_fields > 0 &&
                  ` (${Math.round(
                    (progress.fields_approved / progress.total_fields) * 100
                  )}%)`}
              </span>
            </div>
            <div className="status-row pending">
              <span className="label">⚠ Pending Review</span>
              <span className="value">
                {progress.fields_pending} fields
                {progress.total_fields > 0 &&
                  ` (${Math.round(
                    (progress.fields_pending / progress.total_fields) * 100
                  )}%)`}
              </span>
            </div>
            <div className="status-row unmapped">
              <span className="label">○ Unmapped</span>
              <span className="value">
                {progress.fields_unmapped} fields
                {progress.total_fields > 0 &&
                  ` (${Math.round(
                    (progress.fields_unmapped / progress.total_fields) * 100
                  )}%)`}
              </span>
            </div>
          </div>

          {/* Action Log */}
          <div className="action-log">
            <h3>Recent Actions</h3>
            <div className="log-items">
              {editHistory.length > 0 ? (
                editHistory.map((action, idx) => (
                  <div key={idx} className="log-item">
                    <span className="time">
                      {new Date(action.edited_at).toLocaleTimeString()}
                    </span>
                    <span className="action">
                      {action.action}: {action.after_value || 'unmapped'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty-log">No recent actions</p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Continue Curation
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurationProgress;
