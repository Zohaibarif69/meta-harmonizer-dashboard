/**
 * Loading skeleton component for placeholder UI during data loading
 */

import React from 'react';
import propTypes from 'prop-types';
import './Dashboard.css';

export const MetricCardSkeleton = () => (
  <div className="metric-card loading-skeleton">
    <div className="skeleton-title"></div>
    <div className="skeleton-value"></div>
    <div className="skeleton-detail"></div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="chart-container loading-skeleton">
    <div className="skeleton-chart"></div>
  </div>
);

export const TableSkeleton = () => (
  <div className="table-skeleton">
    <div className="skeleton-row"></div>
    <div className="skeleton-row"></div>
    <div className="skeleton-row"></div>
    <div className="skeleton-row"></div>
    <div className="skeleton-row"></div>
  </div>
);

export const DashboardLoadingSkeleton = () => (
  <div className="dashboard-container">
    <header className="dashboard-header">
      <h1>MetaHarmonizer - Schema Mapping Evaluation Dashboard</h1>
    </header>
    
    <div className="metrics-grid">
      {[...Array(6)].map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>

    <div className="section-divider"></div>
    <ChartSkeleton />
  </div>
);

MetricCardSkeleton.propTypes = {};
ChartSkeleton.propTypes = {};
TableSkeleton.propTypes = {};
DashboardLoadingSkeleton.propTypes = {};

export default {
  MetricCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  DashboardLoadingSkeleton,
};
