/**
 * FieldListItem Component
 * Individual field in the list
 */

import React from 'react';

const FieldListItem = ({ field, isSelected, onClick }) => {
  const getStatusIcon = () => {
    if (field.is_unmapped) return '○';
    if (field.is_approved) return '✓';
    return '⚠';
  };

  const getStatusClass = () => {
    if (field.is_unmapped) return 'status-unmapped';
    if (field.is_approved) return 'status-approved';
    return 'status-pending';
  };

  return (
    <div
      className={`field-list-item ${isSelected ? 'selected' : ''} ${getStatusClass()}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={e => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <span className={`status-icon ${getStatusClass()}`}>
        {getStatusIcon()}
      </span>
      <span className="field-name">{field.original_field_name}</span>
      {field.confidence && (
        <span className="confidence-badge">
          {(field.confidence * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
};

export default FieldListItem;
