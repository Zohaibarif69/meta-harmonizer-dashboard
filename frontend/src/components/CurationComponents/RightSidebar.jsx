/**
 * RightSidebar Component
 * Quick actions panel with auto-approve threshold control
 */

import React from 'react';

const RightSidebar = ({
  currentIndex,
  totalFields,
  onAutoApprove,
  autoApproveThreshold,
  setAutoApproveThreshold,
  isLoading,
}) => {
  const remainingFields = totalFields - currentIndex - 1;

  return (
    <div className="right-sidebar">
      <div className="sidebar-section">
        <h3>Quick Info</h3>
        <div className="info-item">
          <span className="label">Position:</span>
          <span className="value">
            {currentIndex + 1} of {totalFields}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Remaining:</span>
          <span className="value">{Math.max(0, remainingFields)}</span>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Auto-Approve</h3>
        <div className="threshold-control">
          <label htmlFor="threshold-slider">
            Confidence Threshold:
          </label>
          <div className="slider-container">
            <input
              id="threshold-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              value={autoApproveThreshold * 100}
              onChange={e =>
                setAutoApproveThreshold(parseInt(e.target.value) / 100)
              }
              disabled={isLoading}
            />
            <span className="threshold-value">
              {(autoApproveThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={onAutoApprove}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Processing...' : '⚡ Auto-Approve Fields'}
        </button>
        <p className="help-text">
          Auto-approves all fields with confidence ≥ threshold
        </p>
      </div>

      <div className="sidebar-section">
        <h3>Keyboard Shortcuts</h3>
        <div className="shortcuts">
          <div className="shortcut">
            <kbd>↓ / N</kbd> <span>Next</span>
          </div>
          <div className="shortcut">
            <kbd>↑ / P</kbd> <span>Previous</span>
          </div>
          <div className="shortcut">
            <kbd>Enter</kbd> <span>Approve</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
