class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(
      this,
      this.constructor
    );
  }
}

/* ============================================================
   400 - BAD REQUEST
============================================================ */

class BadRequestError extends AppError {
  constructor(
    message = 'Bad request'
  ) {
    super(message, 400);
  }
}

/* ============================================================
   401 - UNAUTHORIZED
============================================================ */

class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized'
  ) {
    super(message, 401);
  }
}

/* ============================================================
   403 - FORBIDDEN
============================================================ */

class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden'
  ) {
    super(message, 403);
  }
}

/* ============================================================
   404 - NOT FOUND
============================================================ */

class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found'
  ) {
    super(message, 404);
  }
}

/* ============================================================
   409 - CONFLICT
============================================================ */

class ConflictError extends AppError {
  constructor(
    message = 'Resource already exists'
  ) {
    super(message, 409);
  }
}

/* ============================================================
   429 - TOO MANY REQUESTS
============================================================ */

class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests'
  ) {
    super(message, 429);
  }
}

/* ============================================================
   503 - SERVICE UNAVAILABLE
============================================================ */

class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service temporarily unavailable'
  ) {
    super(message, 503);
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  ServiceUnavailableError,
};