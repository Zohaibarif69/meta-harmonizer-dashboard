/**
 * ActionButtons Component
 * Bottom action buttons for approving/rejecting field mappings
 */

import React from 'react';

const ActionButtons = ({
  isLoading,
  onApprove,
  onMarkUnmapped,
  onPrevious,
  onNext,
  hasNext,
  hasPrevious,
}) => {
  return (
    <div className="action-buttons">
      <div className="button-group left">
        <button
          className="btn btn-secondary"
          onClick={onPrevious}
          disabled={!hasPrevious || isLoading}
          title="Previous field (⬆️ or P)"
        >
          ← Previous
        </button>
      </div>

      <div className="button-group center">
        <button
          className="btn btn-warning"
          onClick={onMarkUnmapped}
          disabled={isLoading}
          title="Mark field as unmapped"
        >
          ○ Mark Unmapped
        </button>
        <button
          className="btn btn-success"
          onClick={onApprove}
          disabled={isLoading}
          title="Approve selected mapping"
        >
          {isLoading ? '⏳ Saving...' : '✓ Approve'}
        </button>
      </div>

      <div className="button-group right">
        <button
          className="btn btn-secondary"
          onClick={onNext}
          disabled={!hasNext || isLoading}
          title="Next field (⬇️ or N)"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
