// Centralized error handling — AppError class + Express error middleware.
// Throw AppError(statusCode, message) in controllers; this catches everything.

const log = require('../helpers/logger');

class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express identifies error middleware by the 4-param signature (err, req, res, next)
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Only log server errors with full detail; 4xx errors are the client's problem
  if (statusCode === 500) {
    log.error(`[${req.method} ${req.path}] ${message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack || err);
    }
  }

  res.status(statusCode).json({
    error: { message, statusCode },
  });
}

module.exports = { AppError, errorHandler };
