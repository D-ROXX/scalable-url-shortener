const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/userRepository');

const {
  ConflictError,
  UnauthorizedError,
} = require('../utils/errors');

const SALT_ROUNDS = 12;

const JWT_ALGORITHM = 'HS256';

/* ============================================================
   ACCESS TOKEN
============================================================ */

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn:
        process.env.JWT_ACCESS_EXPIRY ||
        '15m',
    }
  );
}

/* ============================================================
   REFRESH TOKEN
============================================================ */

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn:
        process.env.JWT_REFRESH_EXPIRY ||
        '7d',
    }
  );
}

/* ============================================================
   REGISTER
============================================================ */

async function register({
  email,
  password,
}) {
  const normalizedEmail =
    String(email || '')
      .trim()
      .toLowerCase();

  const existing =
    await userRepository.findByEmail(
      normalizedEmail
    );

  if (existing) {
    throw new ConflictError(
      'An account with this email already exists'
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

  const user =
    await userRepository.create({
      email: normalizedEmail,
      passwordHash,
    });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at:
        user.created_at,
    },

    accessToken:
      signAccessToken(user),

    refreshToken:
      signRefreshToken(user),
  };
}

/* ============================================================
   LOGIN
============================================================ */

async function login({
  email,
  password,
}) {
  const normalizedEmail =
    String(email || '')
      .trim()
      .toLowerCase();

  const user =
    await userRepository.findByEmail(
      normalizedEmail
    );

  if (!user) {
    throw new UnauthorizedError(
      'Invalid email or password'
    );
  }

  const isValid =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!isValid) {
    throw new UnauthorizedError(
      'Invalid email or password'
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at:
        user.created_at,
    },

    accessToken:
      signAccessToken(user),

    refreshToken:
      signRefreshToken(user),
  };
}

/* ============================================================
   REFRESH ACCESS TOKEN
============================================================ */

function refreshAccessToken(
  refreshToken
) {
  if (
    typeof refreshToken !==
      'string' ||
    !refreshToken.trim()
  ) {
    throw new UnauthorizedError(
      'Refresh token is required'
    );
  }

  try {
    const payload =
      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET,
        {
          algorithms: [
            JWT_ALGORITHM,
          ],
        }
      );

    if (
      !payload ||
      typeof payload !== 'object' ||
      !payload.sub
    ) {
      throw new UnauthorizedError(
        'Invalid refresh token'
      );
    }

    return jwt.sign(
      {
        sub: String(
          payload.sub
        ),
      },
      process.env.JWT_ACCESS_SECRET,
      {
        algorithm:
          JWT_ALGORITHM,
        expiresIn:
          process.env.JWT_ACCESS_EXPIRY ||
          '15m',
      }
    );
  } catch (err) {
    if (
      err instanceof
      UnauthorizedError
    ) {
      throw err;
    }

    throw new UnauthorizedError(
      'Invalid or expired refresh token'
    );
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  register,
  login,
  refreshAccessToken,
};