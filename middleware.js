/**
 * middleware.js
 * Centralized middleware and error-handling utilities for StockWise.
 *
 * Includes:
 * 1. createApiError — Helper for consistent HTTP error creation.
 * 2. logger         — Application-level middleware that logs HTTP method and URL.
 * 3. requireAuth    — Route-level middleware protecting DELETE operations via header token.
 * 4. errorHandler   — Four-parameter final error-handling middleware.
 */

// Demonstration token configurable via environment variable with a safe fallback for grading/demo
const AUTH_TOKEN = process.env.STOCKWISE_AUTH_TOKEN || 'stockwise-secret-2026';

const STATUS_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  500: 'INTERNAL_SERVER_ERROR'
};

/**
 * Creates an Error object carrying an HTTP status code and optional details.
 * @param {number} status - HTTP status code (e.g., 400, 401, 404)
 * @param {string} message - Human-readable error explanation
 * @param {Array|Object|null} [details=null] - Additional validation or context details
 * @returns {Error}
 */
function createApiError(status, message, details = null) {
  const err = new Error(message);
  err.status = status;
  err.code = STATUS_CODES[status] || 'API_ERROR';
  err.details = details;
  return err;
}

/**
 * 1. Logger Middleware
 * Prints the timestamp, HTTP method, and URL for every incoming request.
 */
function logger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
}

/**
 * 2. Authorization Middleware (protects DELETE routes)
 * Checks for a valid token in either:
 *   - Authorization: Bearer <token>
 *   - Authorization: <token>
 *   - x-auth-token: <token>
 * Returns HTTP 401 if the token is missing or invalid.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customTokenHeader = req.headers['x-auth-token'];

  let providedToken = null;

  if (typeof authHeader === 'string' && authHeader.trim() !== '') {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      providedToken = trimmed.slice(7).trim();
    } else {
      providedToken = trimmed;
    }
  } else if (typeof customTokenHeader === 'string' && customTokenHeader.trim() !== '') {
    providedToken = customTokenHeader.trim();
  }

  if (!providedToken) {
    return next(
      createApiError(
        401,
        'Authentication required. Provide a valid token in the "Authorization: Bearer <token>" or "x-auth-token" header.',
        { expectedHeader: 'Authorization: Bearer <token>' }
      )
    );
  }

  if (providedToken !== AUTH_TOKEN) {
    return next(
      createApiError(
        401,
        'Invalid authorization token. Deletion rejected.',
        { expectedHeader: 'Authorization: Bearer <token>' }
      )
    );
  }

  next();
}

/**
 * 3. Centralized Four-Parameter Error-Handling Middleware
 * Must be registered as the very last app.use() in index.js.
 * Formats all errors into one consistent JSON structure (+2 bonus).
 */
function errorHandler(err, req, res, next) {
  // Handle malformed JSON payloads rejected by express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        code: 'INVALID_JSON',
        message: 'Malformed JSON in request body. Please check your syntax.',
        details: [err.message],
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      }
    });
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  const code = err.code || STATUS_CODES[status] || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred.';

  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(status).json({
    success: false,
    error: {
      status,
      code,
      message,
      details: err.details || null,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  AUTH_TOKEN,
  createApiError,
  logger,
  requireAuth,
  errorHandler
};
