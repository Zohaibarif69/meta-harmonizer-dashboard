/**
 * Base API Client with retry logic, timeout, and error handling
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

class APIClient {
  constructor(baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.timeout = parseInt(process.env.REACT_APP_API_TIMEOUT || DEFAULT_TIMEOUT);
    this.retries = DEFAULT_RETRIES;
  }

  /**
   * Sleep utility for retry delays
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retry logic and timeout
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const {
      method = 'GET',
      body = null,
      headers = {},
      retries = this.retries,
      timeout = this.timeout,
      signal = null,
    } = options;

    // Check if body is FormData (for file uploads)
    const isFormData = body instanceof FormData;

    const defaultHeaders = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    };

    let lastError = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        attempt++;

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptions = {
          method,
          headers: defaultHeaders,
          signal: signal || controller.signal,
        };

        if (body) {
          // For FormData, don't stringify; for JSON, stringify
          if (isFormData) {
            fetchOptions.body = body;
          } else {
            fetchOptions.body = JSON.stringify(body);
          }
        }

        if (process.env.REACT_APP_DEBUG === 'true') {
          console.log(
            `[API Request #${attempt}] ${method} ${url}`,
            isFormData ? '[FormData]' : body
          );
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // Handle non-2xx responses
        if (!response.ok) {
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            // Response wasn't JSON
          }

          const error = new Error(
            errorData.detail || errorData.message || `HTTP ${response.status}`
          );
          error.status = response.status;
          error.data = errorData;
          throw error;
        }

        const data = await response.json();

        if (process.env.REACT_APP_DEBUG === 'true') {
          console.log(`[API Response] ${method} ${url}`, data);
        }

        return data;
      } catch (error) {
        lastError = error;

        // Log detailed error information
        console.error(`[API Error] ${method} ${url}`, {
          name: error.name,
          message: error.message,
          status: error.status,
          data: error.data,
          stack: error.stack
        });

        // Don't retry on client errors (4xx) unless it's a timeout/network error
        const isRetryableError =
          error.name === 'AbortError' || // Timeout
          error instanceof TypeError || // Network error
          (error.status && error.status >= 500); // Server error

        if (!isRetryableError || attempt > retries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delayMs = RETRY_DELAY * attempt;
        if (process.env.REACT_APP_DEBUG === 'true') {
          console.log(
            `[API Retry] Attempt ${attempt}/${retries}. Retrying in ${delayMs}ms...`,
            error.message
          );
        }
        await this.sleep(delayMs);
      }
    }

    throw lastError || new Error('Unknown API error');
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Update base URL (useful for production deployments)
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * Update timeout
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }
}

// Export class as default
export default APIClient;

// Also export a singleton instance for convenience
export const apiClient = new APIClient();
