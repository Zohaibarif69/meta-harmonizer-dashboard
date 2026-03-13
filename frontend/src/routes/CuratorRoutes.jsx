/**
 * CuratorRoutes Component
 * Defines routing for the curator workflow feature
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load components for code splitting
const CurationDashboard = React.lazy(() => import('../components/CurationComponents/CurationDashboard'));

/**
 * Loading fallback component
 */
const LoadingSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</div>
  </div>
);

/**
 * Error boundary wrapper
 */
const ErrorBoundary = ({ error, resetError }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'white',
    padding: '20px'
  }}>
    <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>Oops!</h1>
    <p style={{ color: '#6b7280', marginBottom: '20px', maxWidth: '500px', textAlign: 'center' }}>
      {error?.message || 'Something went wrong'}
    </p>
    <button
      onClick={resetError}
      style={{
        padding: '8px 16px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      Try Again
    </button>
  </div>
);

/**
 * CuratorRoutes component
 * Sets up all routes for the curator workflow feature
 */
const CuratorRoutes = () => {
  const [error, setError] = React.useState(null);

  const resetError = () => {
    setError(null);
  };

  if (error) {
    return <ErrorBoundary error={error} resetError={resetError} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Main curation dashboard route */}
        <Route
          path=":sessionId"
          element={<CurationDashboard onError={setError} />}
        />

        {/* Default route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default CuratorRoutes;
