require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,

  tls:
    process.env.NODE_ENV === "production"
      ? {}
      : undefined,

  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },

  maxRetriesPerRequest: 2,
});

redis.on('error', (err) => {
  // We log but never crash the process on Redis errors — the app must be
  // able to degrade to "always hit Postgres" if the cache is unavailable.
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

module.exports = redis;
