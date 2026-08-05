const redis = require('../config/redis');
const logger = require('../utils/logger');

const TTL = Number(process.env.CACHE_TTL_SECONDS) || 3600;
const keyFor = (code) => `url:${code}`;

// Cache-aside pattern: caller checks get() first; on a miss it queries
// Postgres itself and calls set() to populate the cache. This module never
// touches Postgres directly, so the service layer stays in control of the
// source of truth.
async function get(code) {
  try {
    const cached = await redis.get(keyFor(code));
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    logger.error('Redis GET failed, falling back to DB', { message: err.message });
    return null; // graceful degradation — treat as a cache miss
  }
}

async function set(code, urlRow) {
  try {
    await redis.set(keyFor(code), JSON.stringify(urlRow), 'EX', TTL);
  } catch (err) {
    logger.error('Redis SET failed', { message: err.message });
  }
}

// Called on update/delete so stale data is never served after a write.
async function invalidate(code) {
  try {
    await redis.del(keyFor(code));
  } catch (err) {
    logger.error('Redis DEL failed', { message: err.message });
  }
}

module.exports = { get, set, invalidate };
