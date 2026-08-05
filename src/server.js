const app = require('./app');
const logger = require('./utils/logger');
const pool = require('./config/db');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

// Graceful shutdown: stop accepting new connections, then close DB/Redis
// so in-flight requests and connections drain cleanly (important in Docker/
// Kubernetes where SIGTERM is sent before the container is killed).
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    redis.disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force-exit if shutdown hangs for too long.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
