/**
 * Health Service - API calls for health checks
 */

import { apiClient as api } from './api';

const HEALTH_BASE = '/api/health';

export const healthService = {
  /**
   * Basic health check
   */
  async getHealth() {
    try {
      const response = await api.get(HEALTH_BASE);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch health status: ${error.message}`);
    }
  },

  /**
   * Readiness probe (Kubernetes)
   */
  async isReady() {
    try {
      const response = await api.get(`${HEALTH_BASE}/ready`);
      return response;
    } catch (error) {
      throw new Error(`Service not ready: ${error.message}`);
    }
  },

  /**
   * Liveness probe (Kubernetes)
   */
  async isLive() {
    try {
      const response = await api.get(`${HEALTH_BASE}/live`);
      return response;
    } catch (error) {
      throw new Error(`Service not live: ${error.message}`);
    }
  },
};

export default healthService;
