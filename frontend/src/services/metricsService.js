/**
 * Metrics Service - API calls for metrics endpoints
 */

import { apiClient as api } from './api';

const METRICS_BASE = '/api/metrics';

export const metricsService = {
  /**
   * Get full metrics evaluation with caching
   */
  async getMetrics(useCache = true) {
    try {
      const response = await api.get(`${METRICS_BASE}?use_cache=${useCache}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }
  },

  /**
   * Get metrics summary (quick overview)
   */
  async getSummary() {
    try {
      const response = await api.get(`${METRICS_BASE}/summary`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch metrics summary: ${error.message}`);
    }
  },

  /**
   * Get confidence distribution breakdown
   */
  async getConfidenceDistribution() {
    try {
      const response = await api.get(`${METRICS_BASE}/confidence-distribution`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch confidence distribution: ${error.message}`);
    }
  },

  /**
   * Get method performance comparison
   */
  async getMethodPerformance() {
    try {
      const response = await api.get(`${METRICS_BASE}/method-performance`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch method performance: ${error.message}`);
    }
  },

  /**
   * Get failure case analysis with optional filtering
   * @param {Object} filters - Optional filters { invalid_only, low_confidence_only, method }
   */
  async getFailureAnalysis(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = queryParams
        ? `${METRICS_BASE}/failure-analysis?${queryParams}`
        : `${METRICS_BASE}/failure-analysis`;
      const response = await api.get(url);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch failure analysis: ${error.message}`);
    }
  },

  /**
   * Get detailed statistics with calculations
   */
  async getStatistics() {
    try {
      const response = await api.get(`${METRICS_BASE}/stats`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch statistics: ${error.message}`);
    }
  },

  /**
   * Refresh metrics cache
   */
  async refreshCache() {
    try {
      const response = await api.post(`${METRICS_BASE}/refresh`);
      return response;
    } catch (error) {
      throw new Error(`Failed to refresh cache: ${error.message}`);
    }
  },
};

export default metricsService;
