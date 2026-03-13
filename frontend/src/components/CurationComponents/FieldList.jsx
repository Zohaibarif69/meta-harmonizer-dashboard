/**
 * FieldList Component
 * Left sidebar with scrollable field list, search, and filtering
 */

import React, { useState, useMemo } from 'react';
import FieldListItem from './FieldListItem';

const FieldList = ({ fields, currentFieldId, onSelectField }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredFields = useMemo(() => {
    if (!fields) return [];

    return fields.filter(field => {
      const matchesSearch = field.original_field_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (filterStatus === 'all') return matchesSearch;
      if (filterStatus === 'approved') return matchesSearch && field.is_approved;
      if (filterStatus === 'pending')
        return matchesSearch && !field.is_approved && !field.is_unmapped;
      if (filterStatus === 'unmapped') return matchesSearch && field.is_unmapped;
      return matchesSearch;
    });
  }, [fields, searchQuery, filterStatus]);

  return (
    <div className="field-list-sidebar">
      <div className="field-list-header">
        <h3>Fields ({filteredFields.length}/{fields?.length || 0})</h3>
      </div>

      <input
        type="text"
        placeholder="🔍 Search fields..."
        className="field-search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      <div className="field-filters">
        {['all', 'approved', 'pending', 'unmapped'].map(status => (
          <label key={status} className="filter-radio">
            <input
              type="radio"
              name="status"
              value={status}
              checked={filterStatus === status}
              onChange={() => setFilterStatus(status)}
            />
            <span className="filter-label">
              {status === 'all' && '📋 All'}
              {status === 'approved' && '✓ Approved'}
              {status === 'pending' && '⚠ Pending'}
              {status === 'unmapped' && '○ Unmapped'}
            </span>
          </label>
        ))}
      </div>

      <div className="field-list">
        {filteredFields.length > 0 ? (
          filteredFields.map(field => (
            <FieldListItem
              key={field.id}
              field={field}
              isSelected={field.id === currentFieldId}
              onClick={() => onSelectField(field.id)}
            />
          ))
        ) : (
          <div className="no-fields">No fields match filters</div>
        )}
      </div>
    </div>
  );
};

export default FieldList;
