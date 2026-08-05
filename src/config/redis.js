require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy(times) {
    // Exponential backoff capped at 5s, so a Redis restart doesn't spam
    // reconnect attempts, but the app keeps trying instead of giving up.
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
