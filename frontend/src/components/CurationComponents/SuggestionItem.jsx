/**
 * SuggestionItem Component
 * Individual suggestion card with confidence score and details
 */

import React from 'react';

const StarRating = ({ confidence }) => {
  const stars = Math.round(confidence * 5);
  return <span className="star-rating">{'⭐'.repeat(Math.max(1, stars))}</span>;
};

const SuggestionItem = ({
  suggestion,
  index,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
}) => {
  const confidencePercent = (suggestion.confidence * 100).toFixed(0);

  return (
    <div className={`suggestion-item ${isSelected ? 'selected' : ''}`}>
      <div className="suggestion-header">
        <StarRating confidence={suggestion.confidence} />
        <span className="suggestion-value">{suggestion.suggested_value}</span>
        <span className="confidence-score">{confidencePercent}%</span>
      </div>

      <div className="suggestion-meta">
        <span className="method-badge">{suggestion.method}</span>
        <span className="source-badge">{suggestion.source}</span>
      </div>

      {isExpanded && suggestion.explanation && (
        <div className="suggestion-details">
          <p>{suggestion.explanation}</p>
        </div>
      )}

      <div className="suggestion-actions">
        <button
          className="btn btn-sm btn-primary"
          onClick={onSelect}
        >
          {isSelected ? '✓ Selected' : 'Select'}
        </button>
        {suggestion.explanation && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={onToggleExpand}
          >
            {isExpanded ? '▼ Hide' : '▶ Details'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SuggestionItem;
