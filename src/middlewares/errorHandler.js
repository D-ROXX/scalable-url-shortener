const logger = require('../utils/logger');

/*
 * Global Express error handler.
 *
 * This middleware must be registered LAST,
 * after all routes and the 404 handler.
 */

function errorHandler(err, req, res, next) {
  /*
   * Prevent headers from being sent twice.
   */
  if (res.headersSent) {
    return next(err);
  }

  const isOperational =
    err?.isOperational === true;

  let statusCode = 500;
  let message = 'Internal server error';

  /*
   * ==========================================================
   * OPERATIONAL ERRORS
   * ==========================================================
   */

  if (isOperational) {
    const candidateStatus =
      Number(err.statusCode);

    if (
      Number.isInteger(candidateStatus) &&
      candidateStatus >= 400 &&
      candidateStatus <= 499
    ) {
      statusCode = candidateStatus;
    }

    message =
      err.message ||
      'Request could not be processed';
  }

  /*
   * ==========================================================
   * JSON BODY PARSE ERROR
   * ==========================================================
   */

  if (
    err?.type === 'entity.parse.failed'
  ) {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  /*
   * ==========================================================
   * REQUEST BODY TOO LARGE
   * ==========================================================
   */

  if (
    err?.type === 'entity.too.large'
  ) {
    statusCode = 413;
    message = 'Request payload is too large';
  }

  /*
   * ==========================================================
   * POSTGRESQL ERRORS
   * ==========================================================
   */

  if (
    err?.code === '23505'
  ) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  /*
   * ==========================================================
   * LOGGING
   * ==========================================================
   */

  if (statusCode >= 500) {
    logger.error(
      'Unhandled server error',
      {
        message: err?.message,
        stack: err?.stack,
        method: req.method,
        path: req.path,
      }
    );
  } else {
    logger.warn(
      'Request error',
      {
        message,
        statusCode,
        method: req.method,
        path: req.path,
      }
    );
  }

  /*
   * ==========================================================
   * RESPONSE
   * ==========================================================
   *
   * Never expose:
   * - stack traces
   * - SQL queries
   * - database credentials
   * - internal implementation details
   * - unexpected error messages
   */

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
}

module.exports = errorHandler;