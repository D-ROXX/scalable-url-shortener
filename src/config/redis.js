require('dotenv').config();

const Redis = require('ioredis');

const redisOptions = {
  maxRetriesPerRequest: 2,

  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
};

const isProduction =
  process.env.NODE_ENV === 'production';

/*
 * Production:
 * Use managed Redis URL.
 *
 * Local/Docker:
 * Always use Docker Redis service "redis".
 */
const redis = isProduction && process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      ...redisOptions,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: Number(process.env.REDIS_PORT) || 6379,
      password:
        process.env.REDIS_PASSWORD || undefined,

      ...(String(process.env.REDIS_TLS).toLowerCase() === 'true'
        ? { tls: {} }
        : {}),

      ...redisOptions,
    });

redis.on('error', (err) => {
  console.error(
    'Redis connection error:',
    err.message
  );
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('ready', () => {
  console.log('Redis is ready');
});

module.exports = redis;