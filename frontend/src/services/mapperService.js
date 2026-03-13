/**
 * Mapper Service - API calls for mapper job execution and tracking
 */

import { apiClient as api } from './api';

const MAPPER_BASE = '/api/mapper';

export const mapperService = {
  /**
   * Submit a new mapper job
   * @param {Object} config - {input_file, output_file, method, param1, param2, ...}
   */
  async submitJob(config) {
    try {
      const response = await api.post(`${MAPPER_BASE}/run`, config);
      return response;
    } catch (error) {
      throw new Error(`Failed to submit mapper job: ${error.message}`);
    }
  },

  /**
   * Get job status by ID
   * @param {string} jobId - UUID of the job
   */
  async getJobStatus(jobId) {
    try {
      const response = await api.get(`${MAPPER_BASE}/status/${jobId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch job status: ${error.message}`);
    }
  },

  /**
   * Get job result by ID
   * @param {string} jobId - UUID of the job
   */
  async getJobResult(jobId) {
    try {
      const response = await api.get(`${MAPPER_BASE}/result/${jobId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch job result: ${error.message}`);
    }
  },

  /**
   * List all jobs with optional filtering
   * @param {Object} filters - Optional filters { status, limit, offset }
   */
  async listJobs(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = queryParams ? `${MAPPER_BASE}/jobs?${queryParams}` : `${MAPPER_BASE}/jobs`;
      const response = await api.get(url);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch jobs list: ${error.message}`);
    }
  },

  /**
   * Cancel a running job
   * @param {string} jobId - UUID of the job
   */
  async cancelJob(jobId) {
    try {
      const response = await api.post(`${MAPPER_BASE}/cancel/${jobId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  },

  /**
   * Get mapper configuration
   */
  async getConfig() {
    try {
      const response = await api.get(`${MAPPER_BASE}/config`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch mapper config: ${error.message}`);
    }
  },
};

export default mapperService;
