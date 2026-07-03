/**
 * Global error handler middleware.
 * Catches unhandled errors and returns a consistent JSON response.
 */

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal error occurred'
    : err.message || 'An internal error occurred';

  console.error(`[error] ${statusCode} — ${err.message}`, {
    stack: err.stack,
    path: _req?.path,
    method: _req?.method,
  });

  res.status(statusCode).json({
    success: false,
    error: { code: 'ERR_INTERNAL', message },
  });
}

/**
 * Wraps an async route handler to forward errors to the global handler.
 * @param {Function} fn - Async route handler (req, res, next)
 * @returns {Function}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
