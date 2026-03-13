/**
 * Error Boundary Component - catches React errors and displays fallback UI
 */

import React from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      ...prevState,
      error,
      errorInfo,
    }));

    // Log error details in development
    if (process.env.REACT_APP_DEBUG === 'true') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h1 style={styles.title}>⚠️ Something Went Wrong</h1>
            
            {this.props.showDetails && this.state.error && (
              <div style={styles.errorDetails}>
                <p style={styles.errorMessage}>{this.state.error.toString()}</p>
                
                {this.state.errorInfo && process.env.REACT_APP_DEBUG === 'true' && (
                  <details style={styles.stackTrace}>
                    <summary>Stack Trace</summary>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </details>
                )}
              </div>
            )}

            <p style={styles.message}>
              {this.props.message || 'An unexpected error occurred while rendering this component.'}
            </p>

            <button style={styles.button} onClick={this.handleReset}>
              Try Again
            </button>

            {this.props.showFeedback && (
              <p style={styles.feedback}>
                If the problem persists, please contact support or refresh the page.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  message: PropTypes.string,
  showDetails: PropTypes.bool,
  showFeedback: PropTypes.bool,
  onReset: PropTypes.func,
};

ErrorBoundary.defaultProps = {
  message: null,
  showDetails: process.env.REACT_APP_DEBUG === 'true',
  showFeedback: true,
  onReset: null,
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
  },
  content: {
    textAlign: 'center',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '600px',
  },
  title: {
    color: '#ef4444',
    marginBottom: '20px',
    fontSize: '24px',
  },
  errorDetails: {
    marginBottom: '20px',
    textAlign: 'left',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    padding: '15px',
  },
  errorMessage: {
    color: '#dc2626',
    fontFamily: 'monospace',
    fontSize: '12px',
    marginBottom: '10px',
  },
  stackTrace: {
    marginTop: '10px',
  },
  message: {
    color: '#666',
    marginBottom: '30px',
    lineHeight: '1.6',
  },
  button: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginBottom: '15px',
  },
  feedback: {
    color: '#999',
    fontSize: '12px',
    fontStyle: 'italic',
    marginTop: '15px',
  },
};

export default ErrorBoundary;
