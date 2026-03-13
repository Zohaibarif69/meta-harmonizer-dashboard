/**
 * SessionHeader Component
 * Displays file info, progress bar, and quick actions
 */

import React from 'react';

const SessionHeader = ({ session, onShowProgress, onShowExport }) => {
  const progressPercent = session.total_fields > 0
    ? (session.fields_approved / session.total_fields) * 100
    : 0;

  return (
    <div className="session-header">
      <div className="header-left">
        <h1>
          <span className="file-icon">📁</span>
          {session.metadata_file_id}
        </h1>
        <p className="subtitle">Curation Session</p>
      </div>

      <div className="header-center">
        <div className="progress-container">
          <div className="progress-label">
            Progress: {session.fields_approved}/{session.total_fields}
            ({Math.round(progressPercent)}%)
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat">
            <span className="label">Accuracy:</span>
            <span className="value">
              {(session.average_confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat">
            <span className="label">Approved:</span>
            <span className="value">{session.fields_approved}</span>
          </div>
          <div className="stat">
            <span className="label">Pending:</span>
            <span className="value pending">
              {session.total_fields -
                session.fields_approved -
                session.fields_unmapped}
            </span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-secondary" onClick={onShowProgress}>
          📊 Progress
        </button>
        <button className="btn btn-primary" onClick={onShowExport}>
          💾 Export
        </button>
      </div>
    </div>
  );
};

export default SessionHeader;
