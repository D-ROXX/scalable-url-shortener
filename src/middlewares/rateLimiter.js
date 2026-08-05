const redis = require('../config/redis');
const { TooManyRequestsError } = require('../utils/errors');
const logger = require('../utils/logger');

// Sliding window log algorithm implemented with a Redis sorted set.
//
// Each request adds a timestamp-scored member to a per-key sorted set.
// On each check we trim entries older than the window, then count what's
// left. This is more accurate than a fixed window counter (no burst at
// window boundaries) at O(log N) per request via ZADD/ZREMRANGEBYSCORE/ZCARD.
//
// If Redis is unreachable, we log and allow the request through rather than
// blocking all traffic — availability over strict rate limiting in a
// degraded-cache scenario.
function rateLimiter({ windowMs = 60_000, max = 60, keyPrefix = 'rl' } = {}) {
  return async (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();
      const count = results[2][1];

      if (count > max) {
        throw new TooManyRequestsError(
          `Rate limit exceeded: max ${max} requests per ${windowMs / 1000}s`
        );
      }

      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
      next();
    } catch (err) {
      if (err instanceof TooManyRequestsError) throw err;
      logger.error('Rate limiter Redis error, allowing request through', {
        message: err.message,
      });
      next();
    }
  };
}

module.exports = rateLimiter;
