const logger = require('../utils/logger');

// Must be registered LAST, after all routes. Express recognizes it as an
// error handler because it takes 4 arguments.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational) {
    // Unexpected/programmer errors get full stack logging — these are bugs,
    // not user mistakes, and should be investigated.
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
  } else {
    logger.warn('Operational error', { message: err.message, path: req.path });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? err.message : 'Internal server error',
    },
  });
}

module.exports = errorHandler;
