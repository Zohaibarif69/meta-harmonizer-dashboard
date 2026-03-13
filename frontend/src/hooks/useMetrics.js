/**
 * Custom hook for fetching metrics with caching and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import metricsService from '../services/metricsService';
import { handleAPIError } from '../utils/apiErrors';

export const useMetrics = (useCache = true, polling = false, pollInterval = 5000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await metricsService.getMetrics(useCache);
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [useCache]);

  const refreshMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await metricsService.getMetrics(useCache);
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
    }
  }, [useCache]);

  const refreshCache = useCallback(async () => {
    try {
      setError(null);
      await metricsService.refreshCache();
      await refreshMetrics();
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
    }
  }, [refreshMetrics]);

  useEffect(() => {
    fetchMetrics();

    if (!polling) return;

    // Set up polling interval
    const interval = setInterval(() => {
      refreshMetrics();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchMetrics, refreshMetrics, polling, pollInterval]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: refreshMetrics,
    refreshCache,
  };
};

export default useMetrics;
