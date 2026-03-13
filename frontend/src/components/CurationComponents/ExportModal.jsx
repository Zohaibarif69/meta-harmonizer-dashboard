/**
 * ExportModal Component
 * Modal for generating and downloading export files
 */

import React, { useState } from 'react';
import curatorService from '../../services/curatorService';

const ExportModal = ({ sessionId, onClose }) => {
  const [selectedFormats, setSelectedFormats] = useState(['CSV']);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exports, setExports] = useState(null);
  const [error, setError] = useState(null);

  const handleToggleFormat = (format) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleGenerateExports = async () => {
    if (selectedFormats.length === 0) {
      setError('Please select at least one export format');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const result = await curatorService.generateExports(
        sessionId,
        selectedFormats,
        includeAuditTrail,
        'curator_user'
      );

      setExports(result);
    } catch (err) {
      setError(err.message || 'Error generating exports');
      console.error('Export error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Harmonized Data</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!exports ? (
            <>
              <div className="export-section">
                <h3>Select Export Formats:</h3>
                <div className="format-options">
                  {['CSV', 'JSON', 'PARQUET', 'CUSTOM'].map(format => (
                    <label key={format} className="format-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedFormats.includes(format)}
                        onChange={() => handleToggleFormat(format)}
                        disabled={isGenerating}
                      />
                      <span className="format-label">
                        {format === 'CSV' && '📊 CSV (Spreadsheet)'}
                        {format === 'JSON' && '📝 JSON (Structured)'}
                        {format === 'PARQUET' && '⚡ Parquet (Big Data)'}
                        {format === 'CUSTOM' && '⚙️ Custom Format'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="export-section">
                <label className="audit-trail-checkbox">
                  <input
                    type="checkbox"
                    checked={includeAuditTrail}
                    onChange={e => setIncludeAuditTrail(e.target.checked)}
                    disabled={isGenerating}
                  />
                  <span>Include Curation Audit Trail</span>
                </label>
                <p className="help-text">
                  Includes all curator edits and mapping decisions
                </p>
              </div>

              {error && <div className="error-message">{error}</div>}
            </>
          ) : (
            <div className="export-results">
              <h3>✓ Exports Generated Successfully</h3>
              <div className="export-list">
                {exports.map((exp, idx) => (
                  <div key={idx} className="export-item">
                    <h4>{exp.export_format}</h4>
                    <p className="file-info">
                      {exp.row_count && `${exp.row_count} rows`}
                      {exp.file_size_bytes &&
                        ` • ${(exp.file_size_bytes / 1024).toFixed(2)} KB`}
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        // TODO: Implement download
                        alert('Download link: ' + exp.file_path);
                      }}
                    >
                      💾 Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!exports ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateExports}
                disabled={isGenerating || selectedFormats.length === 0}
              >
                {isGenerating ? '⏳ Generating...' : '📦 Generate Exports'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
