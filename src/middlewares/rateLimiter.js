const redis = require('../config/redis');

const {
  TooManyRequestsError,
  ServiceUnavailableError,
} = require('../utils/errors');

const logger = require('../utils/logger');

/*
 * Sliding-window rate limiter using Redis sorted sets.
 *
 * Each request creates one member:
 *
 *   <timestamp>-<random>
 *
 * Older entries are removed before counting the current window.
 *
 * Redis is used as the shared rate-limit store, so multiple
 * application instances can enforce the same limit.
 */

function rateLimiter({
  windowMs = 60_000,
  max = 60,
  keyPrefix = 'rl',
} = {}) {
  return async (req, res, next) => {
    const identifier =
      req.user?.id || req.ip;

    const key =
      `${keyPrefix}:${identifier}`;

    const now = Date.now();
    const windowStart =
      now - windowMs;

    /*
     * In development we prefer availability if Redis is
     * temporarily unavailable.
     *
     * In production the default is fail-closed because
     * otherwise an attacker could bypass rate limiting simply
     * by causing Redis to become unavailable.
     */
    const failOpen =
      String(
        process.env.RATE_LIMIT_FAIL_OPEN
      ).toLowerCase() === 'true';

    try {
      const pipeline =
        redis.pipeline();

      pipeline.zremrangebyscore(
        key,
        0,
        windowStart
      );

      pipeline.zadd(
        key,
        now,
        `${now}-${Math.random()
          .toString(36)
          .slice(2)}`
      );

      pipeline.zcard(key);

      pipeline.pexpire(
        key,
        windowMs
      );

      const results =
        await pipeline.exec();

      /*
       * ioredis pipeline result:
       *
       * [
       *   [error, result],
       *   [error, result],
       *   [error, result],
       *   [error, result]
       * ]
       */

      if (
        !Array.isArray(results) ||
        !results[2] ||
        results[2][0]
      ) {
        throw new Error(
          'Invalid Redis rate-limit response'
        );
      }

      const count =
        Number(results[2][1]);

      if (
        !Number.isFinite(count)
      ) {
        throw new Error(
          'Invalid Redis rate-limit count'
        );
      }

      /*
       * The current request is already included
       * in the count.
       */
      const remaining =
        Math.max(0, max - count);

      res.set(
        'X-RateLimit-Limit',
        String(max)
      );

      res.set(
        'X-RateLimit-Remaining',
        String(remaining)
      );

      /*
       * Reject requests above the configured limit.
       */
      if (count > max) {
        throw new TooManyRequestsError(
          `Rate limit exceeded: max ${max} requests per ${windowMs / 1000}s`
        );
      }

      return next();
    } catch (err) {
      /*
       * Rate limit violations are expected operational errors.
       */
      if (
        err instanceof
        TooManyRequestsError
      ) {
        throw err;
      }

      /*
       * Redis failure.
       */
      logger.error(
        'Rate limiter Redis error',
        {
          message: err.message,
          keyPrefix,
          path: req.path,
        }
      );

      /*
       * Development:
       * keep the application usable while Redis
       * is being restarted/debugged.
       */
      if (failOpen) {
        return next();
      }

      /*
       * Production:
       * fail closed so the protected endpoint
       * cannot silently bypass rate limiting.
       */
      throw new ServiceUnavailableError(
        'Rate limiting service is temporarily unavailable'
      );
    }
  };
}

module.exports = rateLimiter;