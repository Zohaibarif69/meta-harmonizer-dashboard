/**
 * SuggestionList Component
 * Displays ranked suggestions for a field
 */

import React, { useState } from 'react';
import SuggestionItem from './SuggestionItem';

const SuggestionList = ({
  suggestions,
  selectedIndex,
  onSelectSuggestion,
  useCustom,
}) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="no-suggestions">
        No suggestions available for this field
      </div>
    );
  }

  return (
    <div className="suggestion-list">
      {suggestions.map((suggestion, idx) => (
        <SuggestionItem
          key={suggestion.id || idx}
          suggestion={suggestion}
          index={idx}
          isSelected={idx === selectedIndex && !useCustom}
          isExpanded={idx === expandedIndex}
          onSelect={() => onSelectSuggestion(idx)}
          onToggleExpand={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
        />
      ))}
    </div>
  );
};

export default SuggestionList;
