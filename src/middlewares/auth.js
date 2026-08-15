const jwt = require('jsonwebtoken');

const {
  UnauthorizedError,
  ForbiddenError,
} = require('../utils/errors');

/* ============================================================
   AUTHENTICATE
============================================================ */

function authenticate(req, res, next) {
  const header =
    req.headers.authorization;

  if (
    typeof header !== 'string' ||
    !header.startsWith('Bearer ')
  ) {
    throw new UnauthorizedError(
      'Missing or malformed Authorization header'
    );
  }

  const token =
    header.slice(7).trim();

  if (!token) {
    throw new UnauthorizedError(
      'Missing access token'
    );
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET,
      {
        algorithms: ['HS256'],
      }
    );

    if (
      !payload ||
      typeof payload !== 'object' ||
      !payload.sub ||
      !payload.role
    ) {
      throw new UnauthorizedError(
        'Invalid access token payload'
      );
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch (err) {
    /*
     * Preserve our own UnauthorizedError.
     */
    if (
      err instanceof UnauthorizedError
    ) {
      throw err;
    }

    throw new UnauthorizedError(
      'Invalid or expired access token'
    );
  }
}

/* ============================================================
   ROLE-BASED ACCESS CONTROL
============================================================ */

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (
      !req.user ||
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      throw new ForbiddenError(
        'You do not have permission to perform this action'
      );
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};