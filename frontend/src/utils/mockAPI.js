/**
 * Mock API for testing - simulates backend responses
 */

export const mockHealthResponse = {
  status: 'healthy',
  message: 'Backend service is operational',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
};

export const mockMetricsResponse = {
  total_mappings: 100,
  correct_mappings: 85,
  accuracy_percent: 85.0,
  high_confidence_correct: 72,
  mean_score: 0.824,
  median_score: 0.82,
  invalid_count: 5,
  low_confidence_count: 10,
  method_performance: {
    exact: {
      count: 30,
      avg_score: 0.95,
      valid: 28,
      valid_percent: 93.33,
    },
    fuzzy: {
      count: 30,
      avg_score: 0.82,
      valid: 25,
      valid_percent: 83.33,
    },
    semantic: {
      count: 25,
      avg_score: 0.76,
      valid: 19,
      valid_percent: 76.0,
    },
    llm: {
      count: 15,
      avg_score: 0.75,
      valid: 13,
      valid_percent: 86.67,
    },
  },
  confidence_distribution: {
    excellent: { count: 35, percent: 35.0 },
    good: { count: 28, percent: 28.0 },
    moderate: { count: 22, percent: 22.0 },
    low: { count: 12, percent: 12.0 },
    very_low: { count: 3, percent: 3.0 },
  },
  failure_cases: [
    {
      field_name: 'unknown_field',
      input_value: 'test_value',
      mapped_value: null,
      confidence_score: 0.0,
      method: 'exact',
      reason: 'invalid',
    },
  ],
};

export const mockJobResponse = {
  job_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  status: 'QUEUED',
  message: 'Job submitted successfully',
};

export const mockJobStatusResponse = {
  job_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  status: 'RUNNING',
  progress: 45,
  message: 'Processing field 45 of 100',
};

export const mockJobResultResponse = {
  job_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  status: 'COMPLETED',
  input_file: 'test_input.csv',
  output_file: 'test_output.csv',
  mappings_count: 100,
  duration: 23.45,
  message: 'Job completed successfully',
};

/**
 * Setup mock service worker for testing
 */
export const setupMockHandlers = () => {
  // Mock handlers would be set up here using MSW or similar
  // This is a placeholder for test setup
};

/**
 * Create a mock API client for testing
 */
export const createMockAPIClient = () => {
  return {
    get: async (endpoint) => {
      if (endpoint.includes('/health')) {
        return mockHealthResponse;
      }
      if (endpoint.includes('/metrics')) {
        return mockMetricsResponse;
      }
      throw new Error(`Mock not configured for ${endpoint}`);
    },
    post: async (endpoint, data) => {
      if (endpoint.includes('/mapper/run')) {
        return mockJobResponse;
      }
      if (endpoint.includes('/metrics/refresh')) {
        return { message: 'Cache refreshed' };
      }
      throw new Error(`Mock not configured for ${endpoint}`);
    },
  };
};

export default {
  mockHealthResponse,
  mockMetricsResponse,
  mockJobResponse,
  mockJobStatusResponse,
  mockJobResultResponse,
  setupMockHandlers,
  createMockAPIClient,
};
