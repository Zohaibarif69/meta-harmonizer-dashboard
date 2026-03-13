/**
 * App Router Configuration
 * Main routing setup for the entire application
 * Routes:
 *   / - Home page
 *   /analytics - Analytics & Performance Dashboard
 *   /upload - Upload metadata files
 *   /curator/:sessionId - Curation workflow
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CuratorRoutes from './routes/CuratorRoutes';
import SessionCreator from './components/SessionCreator';

/**
 * Home component - landing page with links to both dashboards
 */
const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>MetaHarmonizer</h1>
      <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
        Welcome to the metadata harmonization platform
      </p>
      
      {/* Two main sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Curation Section */}
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bfdbfe',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, color: '#1e40af' }}>🔧 Manual Curation</h2>
          <p style={{ color: '#333', fontSize: '14px' }}>
            Upload CSV files and manually review/approve field mappings for quality control.
          </p>
          <button
            onClick={() => navigate('/upload')}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              width: '100%'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Start Curation
          </button>
        </div>

        {/* Analytics Section */}
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, color: '#065f46' }}>📊 Analytics Dashboard</h2>
          <p style={{ color: '#333', fontSize: '14px' }}>
            View comprehensive performance metrics, confidence analysis, and mapping quality insights.
          </p>
          <button
            onClick={() => navigate('/analytics')}
            style={{
              padding: '10px 20px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              width: '100%'
            }}
            onMouseOver={(e) => e.target.style.background = '#047857'}
            onMouseOut={(e) => e.target.style.background = '#059669'}
          >
            View Analytics
          </button>
        </div>
      </div>

      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h3 style={{ marginTop: 0 }}>How It Works</h3>
        <ul style={{ color: '#666', lineHeight: '1.8' }}>
          <li><strong>Curation Workflow (Manual):</strong> Upload CSV → Review fields → Approve mappings → Export results</li>
          <li><strong>Analytics Dashboard (Monitoring):</strong> View real-time metrics → Analyze method performance → Identify failures → Plan improvements</li>
          <li><strong>Both Together:</strong> Use analytics to understand patterns, then use curation to manually refine important mappings</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * 404 Not Found component
 */
const NotFound = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'white'
  }}>
    <h1 style={{ fontSize: '48px', fontWeight: '300', margin: '0 0 20px 0' }}>404</h1>
    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Page Not Found</h2>
    <p style={{ color: '#6b7280', marginBottom: '20px' }}>
      The page you're looking for doesn't exist.
    </p>
    <a
      href="/"
      style={{
        padding: '8px 16px',
        background: '#2563eb',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      Go Home
    </a>
  </div>
);

/**
 * AppRouter component
 * Main application routing
 */
const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Home route */}
        <Route path="/" element={<Home />} />

        {/* Analytics dashboard */}
        <Route path="/analytics" element={<Dashboard />} />

        {/* Upload and session creation */}
        <Route path="/upload" element={<SessionCreator />} />

        {/* Curator routes */}
        <Route path="/curator/*" element={<CuratorRoutes />} />

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
