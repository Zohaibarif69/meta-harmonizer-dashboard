/**
 * API error handling utility
 */

export class APIError extends Error {
  constructor(message, status = null, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Parse and handle API errors in a user-friendly way
 */
export const handleAPIError = (error) => {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Network/timeout error
  if (error instanceof TypeError || error.name === 'AbortError') {
    if (error.name === 'AbortError') {
      return 'Request timeout - the server took too long to respond. Please try again.';
    }
    return 'Network error - unable to reach the server. Please check your connection.';
  }

  // API error with status code
  if (error.status) {
    switch (error.status) {
      case 400:
        return `Invalid request: ${error.message}`;
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return `Resource not found: ${error.message}`;
      case 409:
        return `Conflict: ${error.message}`;
      case 422:
        return `Validation error: ${error.message}`;
      case 500:
        return 'Server error - please try again later.';
      case 502:
        return 'Bad gateway - service temporarily unavailable.';
      case 503:
        return 'Service unavailable - maintenance in progress.';
      default:
        return `Error (${error.status}): ${error.message}`;
    }
  }

  // Generic error message
  return error.message || 'An unexpected error occurred';
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  initialDelayMs = 1000,
  shouldRetry = null
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  if (!error) return false;

  // Timeout or network error
  if (error instanceof TypeError || error.name === 'AbortError') {
    return true;
  }

  // Server error (5xx)
  if (error.status && error.status >= 500) {
    return true;
  }

  return false;
};

/**
 * Get error details for logging/debugging
 */
export const getErrorDetails = (error) => {
  return {
    message: error.message || 'Unknown error',
    status: error.status || null,
    data: error.data || null,
    timestamp: new Date().toISOString(),
    stack: process.env.REACT_APP_DEBUG === 'true' ? error.stack : undefined,
  };
};

export default {
  APIError,
  handleAPIError,
  retryWithBackoff,
  isRetryableError,
  getErrorDetails,
};
