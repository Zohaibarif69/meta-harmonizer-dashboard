/**
 * Mapper Panel Component - Submit jobs and track progress
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import useMapperJob from '../hooks/useMapperJob';
import APIErrorDisplay from './ErrorBoundary/APIErrorDisplay';
import { ChartSkeleton } from './LoadingSkeleton';
import './MapperPanel.css';

const MapperPanel = ({ onJobCompleted }) => {
  const { submitJob, jobs, watching, error: jobError } = useMapperJob();
  
  const [formData, setFormData] = useState({
    input_file: '',
    output_file: '',
    mapper_method: 'exact',
    param1: '',
    param2: '',
  });
  
  const [monitoringJobId, setMonitoringJobId] = useState(null);
  const [watchingError, setWatchingError] = useState(null);
  const [dismissedError, setDismissedError] = useState(false);

  const MAPPER_METHODS = ['exact', 'fuzzy', 'semantic', 'llm'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDismissedError(false);

    if (!formData.input_file.trim()) {
      setWatchingError('Input file is required');
      return;
    }

    if (!formData.output_file.trim()) {
      setWatchingError('Output file is required');
      return;
    }

    try {
      setWatchingError(null);
      const jobId = await submitJob({
        input_file: formData.input_file,
        output_file: formData.output_file,
        mapper_method: formData.mapper_method,
        param1: formData.param1 || undefined,
        param2: formData.param2 || undefined,
      });

      setMonitoringJobId(jobId);
      setFormData({
        input_file: '',
        output_file: '',
        mapper_method: 'exact',
        param1: '',
        param2: '',
      });

      // Call callback when job is submitted successfully
      if (onJobCompleted) {
        setTimeout(onJobCompleted, 3000);
      }
    } catch (err) {
      setWatchingError(err.message || 'Failed to submit job');
    }
  };

  if (monitoringJobId) {
    return <JobMonitor jobId={monitoringJobId} onComplete={() => setMonitoringJobId(null)} />;
  }

  return (
    <div className="mapper-panel">
      <h2>Run Schema Mapper</h2>
      
      {(watchingError || jobError) && !dismissedError && (
        <APIErrorDisplay
          error={watchingError || jobError}
          onDismiss={() => setDismissedError(true)}
          onRetry={handleSubmit}
          title="Mapper Error"
        />
      )}

      <form onSubmit={handleSubmit} className="mapper-form">
        <div className="form-group">
          <label htmlFor="input_file">Input File *</label>
          <input
            type="text"
            id="input_file"
            name="input_file"
            value={formData.input_file}
            onChange={handleInputChange}
            placeholder="Path to input file"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="output_file">Output File *</label>
          <input
            type="text"
            id="output_file"
            name="output_file"
            value={formData.output_file}
            onChange={handleInputChange}
            placeholder="Path to output file"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="mapper_method">Mapper Method</label>
          <select
            id="mapper_method"
            name="mapper_method"
            value={formData.mapper_method}
            onChange={handleInputChange}
          >
            {MAPPER_METHODS.map(method => (
              <option key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </option>
            ))}
          </select>
          <small>
            How to match fields:
            <br />• <strong>Exact:</strong> String matching
            <br />• <strong>Fuzzy:</strong> Approximate matching
            <br />• <strong>Semantic:</strong> Meaning-based
            <br />• <strong>LLM:</strong> AI-powered matching
          </small>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label htmlFor="param1">Parameter 1 (Optional)</label>
            <input
              type="text"
              id="param1"
              name="param1"
              value={formData.param1}
              onChange={handleInputChange}
              placeholder="e.g., confidence threshold"
            />
          </div>

          <div className="form-group">
            <label htmlFor="param2">Parameter 2 (Optional)</label>
            <input
              type="text"
              id="param2"
              name="param2"
              value={formData.param2}
              onChange={handleInputChange}
              placeholder="e.g., batch size"
            />
          </div>
        </div>

        <button type="submit" className="submit-button">
          Submit Job
        </button>
      </form>

      {Object.keys(jobs).length > 0 && (
        <div className="jobs-list">
          <h3>Recent Jobs</h3>
          {Object.entries(jobs).map(([jobId, job]) => (
            <div key={jobId} className="job-item">
              <div>
                <strong>{job.config.input_file}</strong>
                <br />
                <small>
                  Status: {job.status} | Method: {job.config.mapper_method} | Progress: {job.progress}%
                </small>
              </div>
              <span className={`status-badge status-${job.status.toLowerCase()}`}>
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const JobMonitor = ({ jobId, onComplete }) => {
  const [jobStatus, setJobStatus] = useState(null);
  const [jobResult, setJobResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedError, setDismissedError] = useState(false);

  const { pollJobStatus, getJobResult, watchJob } = useMapperJob();

  React.useEffect(() => {
    const monitor = async () => {
      try {
        setError(null);
        const result = await watchJob(jobId, (status) => {
          setJobStatus(status);
        });
        setJobResult(result);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Job failed');
        setLoading(false);
      }
    };

    monitor();
  }, [jobId, watchJob]);

  if (loading && !jobStatus) {
    return (
      <div className="job-monitor">
        <h3>Monitoring Job: {jobId}</h3>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="job-monitor">
      <h3>Job Progress</h3>

      {error && !dismissedError && (
        <APIErrorDisplay
          error={error}
          onDismiss={() => setDismissedError(true)}
          title="Job Status"
        />
      )}

      {jobStatus && (
        <div className="job-status">
          <div className="status-display">
            <span className={`status-badge status-${jobStatus.status.toLowerCase()}`}>
              {jobStatus.status}
            </span>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${jobStatus.progress || 0}%` }}
              ></div>
            </div>
            <span className="progress-text">{jobStatus.progress || 0}%</span>
          </div>
          {jobStatus.message && (
            <p className="status-message">{jobStatus.message}</p>
          )}
        </div>
      )}

      {jobResult && (
        <div className="job-result">
          <h4>Job Completed Successfully</h4>
          <div className="result-details">
            <p><strong>Input:</strong> {jobResult.input_file}</p>
            <p><strong>Output:</strong> {jobResult.output_file}</p>
            <p><strong>Mappings Processed:</strong> {jobResult.mappings_count || 'N/A'}</p>
            <p><strong>Duration:</strong> {jobResult.duration || 'N/A'}s</p>
          </div>
          <button onClick={onComplete} className="close-button">
            Close & Refresh Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

MapperPanel.propTypes = {
  onJobCompleted: PropTypes.func,
};

MapperPanel.defaultProps = {
  onJobCompleted: null,
};

JobMonitor.propTypes = {
  jobId: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired,
};

export default MapperPanel;
