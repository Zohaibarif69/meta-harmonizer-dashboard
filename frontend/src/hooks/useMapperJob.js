/**
 * Custom hook for mapper job submission, polling, and management
 */

import { useState, useCallback, useEffect } from 'react';
import mapperService from '../services/mapperService';
import { handleAPIError } from '../utils/apiErrors';

const JOB_STATUS_POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_DURATION = 3600000; // 1 hour

export const useMapperJob = () => {
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Submit a new mapper job
   */
  const submitJob = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      const response = await mapperService.submitJob(config);
      const jobId = response.job_id;

      // Initialize job tracking
      setJobs(prev => ({
        ...prev,
        [jobId]: {
          id: jobId,
          status: response.status,
          config,
          createdAt: new Date(),
          progress: 0,
          result: null,
          message: response.message || 'Job submitted',
        },
      }));

      return jobId;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Poll job status
   */
  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const response = await mapperService.getJobStatus(jobId);
      if (response) {
        setJobs(prev => ({
          ...prev,
          [jobId]: {
            ...prev[jobId],
            status: response.status,
            progress: response.progress || 0,
            message: response.message || '',
          },
        }));
      }
      return response;
    } catch (err) {
      console.error(`Error polling job ${jobId}:`, err);
      return null;
    }
  }, []);

  /**
   * Get job result
   */
  const getJobResult = useCallback(async (jobId) => {
    try {
      const response = await mapperService.getJobResult(jobId);
      if (response) {
        setJobs(prev => ({
          ...prev,
          [jobId]: {
            ...prev[jobId],
            result: response,
          },
        }));
      }
      return response;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Watch job until completion with timeout
   */
  const watchJob = useCallback(
    async (jobId, onStatusChange = null, timeoutMs = MAX_POLLING_DURATION) => {
      let pollCount = 0;
      const maxPolls = timeoutMs / JOB_STATUS_POLLING_INTERVAL;

      return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          pollCount++;

          // Check timeout
          if (pollCount > maxPolls) {
            clearInterval(pollInterval);
            reject(new Error('Job polling timeout'));
            return;
          }

          try {
            const status = await pollJobStatus(jobId);
            if (onStatusChange) {
              onStatusChange(status);
            }

            // Check if job is complete
            if (status && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status.status)) {
              clearInterval(pollInterval);

              if (status.status === 'COMPLETED') {
                const result = await getJobResult(jobId);
                resolve(result);
              } else {
                reject(
                  new Error(
                    `Job ${status.status}: ${status.message || 'No message provided'}`
                  )
                );
              }
            }
          } catch (err) {
            clearInterval(pollInterval);
            reject(err);
          }
        }, JOB_STATUS_POLLING_INTERVAL);
      });
    },
    [pollJobStatus, getJobResult]
  );

  /**
   * Cancel a job
   */
  const cancelJob = useCallback(async (jobId) => {
    try {
      setError(null);
      const response = await mapperService.cancelJob(jobId);
      if (response) {
        setJobs(prev => ({
          ...prev,
          [jobId]: {
            ...prev[jobId],
            status: 'CANCELLED',
            message: response.message || 'Job cancelled',
          },
        }));
      }
      return response;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Get job details
   */
  const getJob = useCallback((jobId) => {
    return jobs[jobId] || null;
  }, [jobs]);

  /**
   * List all jobs
   */
  const listJobs = useCallback(
    async (filters = {}) => {
      try {
        setError(null);
        const response = await mapperService.listJobs(filters);
        return response;
      } catch (err) {
        const errorMessage = handleAPIError(err);
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Clear a job from local tracking
   */
  const clearJob = useCallback((jobId) => {
    setJobs(prev => {
      const updated = { ...prev };
      delete updated[jobId];
      return updated;
    });
  }, []);

  return {
    jobs,
    loading,
    error,
    submitJob,
    pollJobStatus,
    getJobResult,
    watchJob,
    cancelJob,
    getJob,
    listJobs,
    clearJob,
  };
};

export default useMapperJob;
