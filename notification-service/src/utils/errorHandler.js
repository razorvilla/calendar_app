const logger = require('./logger');

/**
 * Global error handler middleware for Express
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error(`Uncaught exception: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Set status code
  const statusCode = err.statusCode || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}

/**
 * Custom error class with status code
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper
 * Eliminates need for try/catch blocks in route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = errorHandler;
module.exports.AppError = AppError;
module.exports.asyncHandler = asyncHandler;
