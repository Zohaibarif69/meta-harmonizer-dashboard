/**
 * ManualInput Component
 * Allows curator to enter custom field mapping
 */

import React, { useState } from 'react';

const ManualInput = ({ value, onChange, onToggleCustom, isActive }) => {
  const [showOntologyOptions, setShowOntologyOptions] = useState(false);
  const [selectedOntologies, setSelectedOntologies] = useState({
    ncit: false,
    umls: false,
    snomed: false,
  });

  return (
    <div className="manual-input-section">
      <div className="input-container">
        <label htmlFor="custom-field-input">Standard Field Name:</label>
        <div className="input-group">
          <input
            id="custom-field-input"
            type="text"
            className={`field-input ${isActive ? 'active' : ''}`}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="e.g., white_blood_cells, age, diagnosis"
            disabled={!isActive}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowOntologyOptions(!showOntologyOptions)}
          >
            🔍 Ontology
          </button>
        </div>
      </div>

      {showOntologyOptions && (
        <div className="ontology-options">
          <label>Reference Ontologies:</label>
          {['ncit', 'umls', 'snomed'].map(ont => (
            <label key={ont} className="checkbox">
              <input
                type="checkbox"
                checked={selectedOntologies[ont]}
                onChange={e =>
                  setSelectedOntologies({
                    ...selectedOntologies,
                    [ont]: e.target.checked,
                  })
                }
              />
              <span className="ontology-label">{ont.toUpperCase()}</span>
            </label>
          ))}
        </div>
      )}

      <button
        className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
        onClick={onToggleCustom}
      >
        {isActive ? '✓ Use Custom | Value' : 'Use Custom Value'}
      </button>
    </div>
  );
};

export default ManualInput;
