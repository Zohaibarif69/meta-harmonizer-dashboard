/**
 * FieldEditor Component
 * Main curation interface for reviewing and editing field mappings
 */

import React, { useState } from 'react';
import SuggestionList from './SuggestionList';
import ManualInput from './ManualInput';
import ActionButtons from './ActionButtons';

const FieldEditor = ({
  field,
  sessionId,
  onUpdate,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  isSaving,
}) => {
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [customValue, setCustomValue] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [notes, setNotes] = useState('');

  if (!field) {
    return (
      <div className="field-editor empty">
        <p>Select a field to begin curation</p>
      </div>
    );
  }

  const handleApprove = () => {
    const mappedValue = useCustom
      ? customValue
      : field.suggestions?.[selectedSuggestionIndex]?.suggested_value;

    if (!mappedValue && !useCustom) {
      alert('Please select or enter a mapping value');
      return;
    }

    onUpdate({
      field_id: field.id,
      standardized_field_name: mappedValue,
      mapping_source: useCustom ? 'curator_manual' : 'curator',
      chosen_suggestion_index: useCustom ? -1 : selectedSuggestionIndex,
      is_manual_entry: useCustom,
      mapping_notes: notes,
      curator_user_id: 'current_user', // TODO: Get from context
    });

    // Reset form
    setCustomValue('');
    setUseCustom(false);
    setNotes('');
    setSelectedSuggestionIndex(0);
  };

  const handleMarkUnmapped = () => {
    onUpdate({
      field_id: field.id,
      standardized_field_name: null,
      mapping_source: 'unmapped',
      is_unmapped: true,
      mapping_notes: notes || 'Marked as unmapped',
      curator_user_id: 'current_user',
    });

    setNotes('');
  };

  return (
    <div className="field-editor">
      <div className="editor-header">
        <h2>FIELD: {field.original_field_name}</h2>
        <span className="field-id">ID: {field.id}</span>
      </div>

      <div className="editor-body">
        {/* Sample Values */}
        <div className="section">
          <h3>Sample Values from Data:</h3>
          <div className="sample-values">
            {field.sample_values?.length > 0 ? (
              field.sample_values.map((val, idx) => (
                <span key={idx} className="sample-badge">
                  {String(val).substring(0, 50)}
                  {String(val).length > 50 ? '...' : ''}
                </span>
              ))
            ) : (
              <span className="sample-badge empty">No sample values</span>
            )}
          </div>
        </div>

        {/* Automated Suggestions */}
        <div className="section">
          <h3>Top Suggestions (Ranked by Confidence):</h3>
          {field.suggestions && field.suggestions.length > 0 ? (
            <SuggestionList
              suggestions={field.suggestions}
              selectedIndex={selectedSuggestionIndex}
              onSelectSuggestion={setSelectedSuggestionIndex}
              useCustom={useCustom}
            />
          ) : (
            <div className="no-suggestions">
              No suggestions available. Use custom mapping below.
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div className="section">
          <h3>OR Enter Custom Mapping:</h3>
          <ManualInput
            value={customValue}
            onChange={setCustomValue}
            onToggleCustom={() => setUseCustom(!useCustom)}
            isActive={useCustom}
          />
        </div>

        {/* Notes */}
        <div className="section">
          <label htmlFor="notes-input">Curation Notes (Optional):</label>
          <textarea
            id="notes-input"
            className="notes-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why did you choose this mapping?"
            rows="3"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        isLoading={isSaving}
        onApprove={handleApprove}
        onMarkUnmapped={handleMarkUnmapped}
        onPrevious={onPrevious}
        onNext={onNext}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
      />
    </div>
  );
};

export default FieldEditor;
