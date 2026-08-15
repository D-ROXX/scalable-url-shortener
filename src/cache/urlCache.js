const redis = require('../config/redis');
const logger = require('../utils/logger');

/* ============================================================
   CACHE CONFIGURATION
============================================================ */

const parsedTTL = Number(
  process.env.CACHE_TTL_SECONDS
);

const TTL =
  Number.isFinite(parsedTTL) &&
  parsedTTL > 0
    ? parsedTTL
    : 3600;

function keyFor(code) {
  return `url:${String(code)}`;
}

/* ============================================================
   GET
============================================================ */

/*
 * Cache-aside read.
 *
 * Redis failure is treated as a cache miss.
 * The service layer remains responsible for querying PostgreSQL.
 */

async function get(code) {
  const key = keyFor(code);

  try {
    const cached =
      await redis.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (err) {
      /*
       * Corrupted cache entry.
       * Remove it so future requests don't repeatedly
       * encounter the same invalid JSON.
       */
      logger.warn(
        'Invalid JSON found in Redis cache',
        {
          key,
          message: err.message,
        }
      );

      await redis.del(key);

      return null;
    }
  } catch (err) {
    /*
     * Redis is a cache, not the source of truth.
     * PostgreSQL remains the fallback.
     */
    logger.error(
      'Redis GET failed, falling back to DB',
      {
        message: err.message,
        key,
      }
    );

    return null;
  }
}

/* ============================================================
   SET
============================================================ */

/*
 * Populate cache after a PostgreSQL read.
 *
 * Redis failure must never make URL creation/redirect resolution
 * fail because the database remains the source of truth.
 */

async function set(code, urlRow) {
  const key = keyFor(code);

  try {
    await redis.set(
      key,
      JSON.stringify(urlRow),
      'EX',
      TTL
    );
  } catch (err) {
    logger.error(
      'Redis SET failed',
      {
        message: err.message,
        key,
      }
    );
  }
}

/* ============================================================
   INVALIDATE
============================================================ */

/*
 * Called after URL deletion/update.
 */

async function invalidate(code) {
  if (
    code === undefined ||
    code === null ||
    code === ''
  ) {
    return;
  }

  const key = keyFor(code);

  try {
    await redis.del(key);
  } catch (err) {
    logger.error(
      'Redis DEL failed',
      {
        message: err.message,
        key,
      }
    );
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  get,
  set,
  invalidate,
};