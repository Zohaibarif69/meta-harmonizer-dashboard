import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ConfidenceDistribution from './ConfidenceDistribution';
import MethodPerformance from './MethodPerformance';
import AccuracyMetrics from './AccuracyMetrics';
import MapperOutputAnalysis from './MapperOutputAnalysis';
import FailureCaseAnalysis from './FailureCaseAnalysis';
import MapperPanel from './MapperPanel';
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';
import APIErrorDisplay from './ErrorBoundary/APIErrorDisplay';
import { DashboardLoadingSkeleton } from './LoadingSkeleton';
import useMetrics from '../hooks/useMetrics';
import { handleAPIError } from '../utils/apiErrors';
import healthService from '../services/healthService';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showMapperPanel, setShowMapperPanel] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [dismissedError, setDismissedError] = useState(false);
  
  // Use the custom hook for metrics
  const { 
    data: apiMetrics, 
    loading, 
    error, 
    lastUpdated,
    refresh: refreshMetrics,
    refreshCache
  } = useMetrics(true, false);

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await healthService.getHealth();
        setBackendHealth(health);
      } catch (err) {
        console.warn('Backend health check failed:', err);
        setBackendHealth(null);
      }
    };

    checkHealth();
  }, []);

  const getSampleMetrics = () => ({
    total_mappings: 10,
    correct_mappings: 0,
    accuracy_percent: 0,
    high_confidence_correct: 0,
    mean_score: 0.8240,
    median_score: 0.8200,
    invalid_count: 10,
    low_confidence_count: 1,
    method_performance: {
      exact: { count: 3, avg_score: 0.9433, valid: 0, valid_percent: 0 },
      fuzzy: { count: 3, avg_score: 0.8367, valid: 0, valid_percent: 0 },
      semantic: { count: 3, avg_score: 0.7500, valid: 0, valid_percent: 0 },
      llm: { count: 1, avg_score: 0.6500, valid: 0, valid_percent: 0 }
    }
  });

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  // Transform API response to frontend format
  const transformMetricsResponse = (apiMetrics) => {
    if (!apiMetrics) return getSampleMetrics();
    
    // Handle both nested API structure (metrics.metrics) and flat structure
    const metricsData = apiMetrics.metrics || apiMetrics;
    const methodsArray = apiMetrics.method_performance || [];
    const failureCases = apiMetrics.failure_cases || [];
    
    // Calculate invalid and low confidence counts from failure cases
    const invalidCount = failureCases.filter(f => f.failure_type === 'no_match' || f.failure_type === 'invalid').length;
    const lowConfCount = failureCases.filter(f => f.failure_type === 'low_confidence').length;
    
    // Convert method_performance array to dict
    const methodPerformanceDict = {};
    methodsArray.forEach((method) => {
      const methodName = method.method_name?.toLowerCase() || '';
      methodPerformanceDict[methodName] = {
        count: method.count ?? 0,
        avg_score: method.avg_confidence ?? 0,
        valid: method.correct ?? 0,
        valid_percent: method.count > 0 ? (method.correct / method.count) * 100 : 0
      };
    });

    return {
      total_mappings: metricsData?.total_mappings ?? 0,
      correct_mappings: metricsData?.correct_mappings ?? 0,
      accuracy_percent: ((metricsData?.accuracy ?? 0) * 100),
      high_confidence_correct: metricsData?.high_confidence_correct ?? 0,
      mean_score: metricsData?.confidence_mean ?? 0,
      median_score: metricsData?.confidence_median ?? 0,
      invalid_count: invalidCount,
      low_confidence_count: lowConfCount,
      method_performance: Object.keys(methodPerformanceDict).length > 0 ? methodPerformanceDict : {
        exact: { count: 0, avg_score: 0, valid: 0, valid_percent: 0 },
        fuzzy: { count: 0, avg_score: 0, valid: 0, valid_percent: 0 },
        semantic: { count: 0, avg_score: 0, valid: 0, valid_percent: 0 },
        llm: { count: 0, avg_score: 0, valid: 0, valid_percent: 0 }
      }
    };
  };

  // Use fallback data if no metrics available, and normalize the data
  const displayMetrics = transformMetricsResponse(apiMetrics);
  
  // Create comprehensive metrics object that includes both flat and nested data
  const metrics = apiMetrics ? {
    ...displayMetrics,
    // Include original nested data for components that need it
    confidence_distribution: apiMetrics.confidence_distribution,
    failure_cases: apiMetrics.failure_cases,
    method_performance_array: apiMetrics.method_performance
  } : displayMetrics;
  const hasError = error && !dismissedError;

  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="header-title">MetaHarmonizer - Schema Mapping Evaluation Dashboard</h1>
              <p className="header-subtitle">Comprehensive analysis of schema mapper performance</p>
            </div>
            
            <div className="header-right">
              <div className="header-status">
                {lastUpdated && (
                  <div className="status-info">
                    <span className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                    {backendHealth && (
                      <span className="backend-status">
                        <span className="status-dot">✓</span> Backend connected
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="header-buttons">
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowMapperPanel(!showMapperPanel)}
                >
                  {showMapperPanel ? 'Hide' : 'Run'} Mapper
                </button>
                <button 
                  className="btn btn-success"
                  onClick={refreshMetrics}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mapper Panel */}
        {showMapperPanel && (
          <ErrorBoundary>
            <MapperPanel onJobCompleted={refreshMetrics} />
          </ErrorBoundary>
        )}

        {/* API Error Display */}
        {hasError && (
          <APIErrorDisplay 
            error={error}
            onDismiss={() => setDismissedError(true)}
            onRetry={refreshMetrics}
            showDetails={true}
            title="Metrics Loading Error"
          />
        )}

        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'confidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('confidence')}
          >
            Confidence Analysis
          </button>
          <button 
            className={`tab-button ${activeTab === 'methods' ? 'active' : ''}`}
            onClick={() => setActiveTab('methods')}
          >
            Method Performance
          </button>
          <button 
            className={`tab-button ${activeTab === 'failures' ? 'active' : ''}`}
            onClick={() => setActiveTab('failures')}
          >
            Failure Analysis
          </button>
          <button 
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
        </div>

        <div className="dashboard-content">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              <div className="metrics-grid">
                <div className="metric-card">
                  <h3>Overall Accuracy</h3>
                  <div className="metric-value">{(metrics?.accuracy_percent || 0).toFixed(1)}%</div>
                  <p className="metric-detail">{metrics?.correct_mappings || 0}/{metrics?.total_mappings || 0} mappings correct</p>
                </div>
                
                <div className="metric-card">
                  <h3>Total Mappings</h3>
                  <div className="metric-value">{metrics?.total_mappings || 0}</div>
                  <p className="metric-detail">columns evaluated</p>
                </div>
                
                <div className="metric-card">
                  <h3>Mean Confidence</h3>
                  <div className="metric-value">{(metrics?.mean_score || 0).toFixed(4)}</div>
                  <p className="metric-detail">median: {(metrics?.median_score || 0).toFixed(4)}</p>
                </div>
                
                <div className="metric-card">
                  <h3>High Confidence + Correct</h3>
                  <div className="metric-value">{metrics.high_confidence_correct}</div>
                  <p className="metric-detail">score ≥ 0.90</p>
                </div>
                
                <div className="metric-card alert">
                  <h3>Invalid Mappings</h3>
                  <div className="metric-value">{metrics.invalid_count}</div>
                  <p className="metric-detail">not in standard fields</p>
                </div>
                
                <div className="metric-card alert">
                  <h3>Low Confidence</h3>
                  <div className="metric-value">{metrics.low_confidence_count}</div>
                  <p className="metric-detail">score &lt; 0.70</p>
                </div>
              </div>

              <div className="section-divider"></div>

              <ErrorBoundary>
                <AccuracyMetrics metrics={metrics} />
              </ErrorBoundary>
            </div>
          )}

          {/* CONFIDENCE TAB */}
          {activeTab === 'confidence' && (
            <div className="tab-content">
              <ErrorBoundary>
                <ConfidenceDistribution metrics={metrics} />
              </ErrorBoundary>
            </div>
          )}

          {/* METHODS TAB */}
          {activeTab === 'methods' && (
            <div className="tab-content">
              <ErrorBoundary>
                <MethodPerformance metrics={metrics} />
              </ErrorBoundary>
            </div>
          )}

          {/* FAILURES TAB */}
          {activeTab === 'failures' && (
            <div className="tab-content">
              <ErrorBoundary>
                <FailureCaseAnalysis metrics={metrics} />
              </ErrorBoundary>
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="tab-content">
              <ErrorBoundary>
                <MapperOutputAnalysis metrics={metrics} />
              </ErrorBoundary>
            </div>
          )}
        </div>

        <footer className="dashboard-footer">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p>MetaHarmonizer Schema Mapping Engine v1.0</p>
          <small>API: {process.env.REACT_APP_API_BASE_URL}</small>
        </footer>
      </div>
    </ErrorBoundary>
  );
};


export default Dashboard;

// PropTypes validation (optional, for development)
Dashboard.propTypes = {
  /* No props - Dashboard is a container component */
};
