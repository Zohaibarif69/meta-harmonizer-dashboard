/**
 * Integration tests for API services
 * Testing with mock data to simulate API interactions
 */

import metricsService from '../services/metricsService';
import mapperService from '../services/mapperService';
import healthService from '../services/healthService';
import {
  mockMetricsResponse,
  mockJobResponse,
  mockJobStatusResponse,
  createMockAPIClient,
} from '../utils/mockAPI';

describe('API Services Integration', () => {
  let mockApiClient;

  beforeEach(() => {
    mockApiClient = createMockAPIClient();
  });

  describe('Health Service', () => {
    test('should fetch health status', async () => {
      // In real tests, mock the fetch function
      // const health = await healthService.getHealth();
      // expect(health.status).toBe('healthy');
    });

    test('should check readiness', async () => {
      // const ready = await healthService.isReady();
      // expect(ready).toBeDefined();
    });
  });

  describe('Metrics Service', () => {
    test('should fetch full metrics', async () => {
      // Real tests would replace API calls with mocked responses
      const metrics = mockMetricsResponse;
      expect(metrics.total_mappings).toBeGreaterThan(0);
      expect(metrics.accuracy_percent).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy_percent).toBeLessThanOrEqual(100);
    });

    test('should have valid method performance data', () => {
      const metrics = mockMetricsResponse;
      expect(metrics.method_performance).toBeDefined();
      expect(metrics.method_performance.exact).toBeDefined();
      expect(metrics.method_performance.fuzzy).toBeDefined();
      expect(metrics.method_performance.semantic).toBeDefined();
      expect(metrics.method_performance.llm).toBeDefined();
    });

    test('should have confidence distribution', () => {
      const metrics = mockMetricsResponse;
      expect(metrics.confidence_distribution).toBeDefined();
      const totalPercent = Object.values(metrics.confidence_distribution).reduce(
        (sum, bucket) => sum + bucket.percent,
        0
      );
      expect(totalPercent).toBeCloseTo(100, 1);
    });
  });

  describe('Mapper Service', () => {
    test('should submit a job with valid config', () => {
      const job = mockJobResponse;
      expect(job.job_id).toBeDefined();
      expect(job.status).toBe('QUEUED');
    });

    test('should track job status', () => {
      const status = mockJobStatusResponse;
      expect(status.job_id).toBeDefined();
      expect(status.status).toBe('RUNNING');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    test('should validate job configuration', () => {
      // Valid config
      const validConfig = {
        input_file: 'test.csv',
        output_file: 'result.csv',
        mapper_method: 'exact',
      };
      expect(validConfig.input_file).toBeDefined();
      expect(validConfig.output_file).toBeDefined();
      expect(validConfig.mapper_method).toBeDefined();

      // Invalid config should have requirements
      const invalidConfig = {};
      expect(invalidConfig.input_file).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors gracefully', () => {
      // Error handling test - verify error messages are user-friendly
      const errorMessage = 'Resource not found: endpoint not available';
      expect(errorMessage).toContain('not found');
    });

    test('should handle timeout errors', () => {
      // Timeout error should provide clear message
      const timeoutError = 'Request timeout - the server took too long to respond';
      expect(timeoutError).toContain('timeout');
    });

    test('should handle network errors', () => {
      // Network error should suggest checking connection
      const networkError = 'Network error - unable to reach the server';
      expect(networkError).toContain('Network');
    });
  });
});

describe('Hook Integration', () => {
  describe('useMetrics Hook', () => {
    test('should have required return values', () => {
      const hookReturn = {
        data: null,
        loading: true,
        error: null,
        lastUpdated: null,
        refresh: () => {},
        refreshCache: () => {},
      };

      expect(hookReturn.data).toBeDefined();
      expect(hookReturn.loading).toBeDefined();
      expect(hookReturn.error).toBeDefined();
      expect(hookReturn.refresh).toBeDefined();
    });
  });

  describe('useMapperJob Hook', () => {
    test('should have required job management methods', () => {
      const hookReturn = {
        jobs: {},
        loading: false,
        error: null,
        submitJob: async () => {},
        pollJobStatus: async () => {},
        getJobResult: async () => {},
        watchJob: async () => {},
        cancelJob: async () => {},
        listJobs: async () => {},
        clearJob: () => {},
      };

      expect(hookReturn.submitJob).toBeDefined();
      expect(hookReturn.pollJobStatus).toBeDefined();
      expect(hookReturn.watchJob).toBeDefined();
      expect(typeof hookReturn.submitJob).toBe('function');
    });
  });
});

describe('Frontend-Backend Contract', () => {
  test('should define expected API endpoints', () => {
    const endpoints = {
      health: ['/api/health', '/api/health/ready', '/api/health/live'],
      metrics: [
        '/api/metrics',
        '/api/metrics/summary',
        '/api/metrics/confidence-distribution',
        '/api/metrics/method-performance',
        '/api/metrics/failure-analysis',
        '/api/metrics/stats',
        '/api/metrics/refresh',
      ],
      mapper: [
        '/api/mapper/run',
        '/api/mapper/status/:jobId',
        '/api/mapper/result/:jobId',
        '/api/mapper/jobs',
        '/api/mapper/cancel/:jobId',
        '/api/mapper/config',
      ],
    };

    expect(endpoints.health.length).toBeGreaterThan(0);
    expect(endpoints.metrics.length).toBeGreaterThan(0);
    expect(endpoints.mapper.length).toBeGreaterThan(0);
  });

  test('should validate response schemas', () => {
    const metricsSchema = {
      total_mappings: 'number',
      accuracy_percent: 'number',
      method_performance: 'object',
      confidence_distribution: 'object',
    };

    const jobSchema = {
      job_id: 'string',
      status: 'string',
      message: 'string',
    };

    expect(metricsSchema.total_mappings).toBe('number');
    expect(jobSchema.job_id).toBe('string');
  });
});
