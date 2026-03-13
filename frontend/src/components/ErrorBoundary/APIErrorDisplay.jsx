/**
 * API Error Display Component - shows API errors to users
 */

import React from 'react';
import PropTypes from 'prop-types';

const APIErrorDisplay = ({
  error,
  onDismiss,
  onRetry,
  showDetails = false,
  title = 'Error',
}) => {
  if (!error) return null;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.icon}>❌</span>
          <h3 style={styles.title}>{title}</h3>
          {onDismiss && (
            <button style={styles.closeButton} onClick={onDismiss}>
              ✕
            </button>
          )}
        </div>

        <p style={styles.message}>{error}</p>

        {showDetails && (
          <div style={styles.details}>
            <small>
              {new Date().toLocaleTimeString()} - Please try refreshing the page if the problem
              persists.
            </small>
          </div>
        )}

        <div style={styles.actions}>
          {onRetry && (
            <button style={styles.button} onClick={onRetry}>
              Retry
            </button>
          )}
          {onDismiss && (
            <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

APIErrorDisplay.propTypes = {
  error: PropTypes.string,
  onDismiss: PropTypes.func,
  onRetry: PropTypes.func,
  showDetails: PropTypes.bool,
  title: PropTypes.string,
};

APIErrorDisplay.defaultProps = {
  error: null,
  onDismiss: null,
  onRetry: null,
  showDetails: false,
  title: 'Error',
};

const styles = {
  container: {
    marginBottom: '20px',
    animation: 'slideIn 0.3s ease-in-out',
  },
  content: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '20px',
  },
  title: {
    margin: 0,
    color: '#dc2626',
    flex: 1,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#999',
    padding: 0,
    lineHeight: 1,
  },
  message: {
    margin: '0 0 12px 0',
    color: '#991b1b',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  details: {
    marginBottom: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #fecaca',
    color: '#999',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#d1d5db',
    color: '#333',
  },
};

export default APIErrorDisplay;
