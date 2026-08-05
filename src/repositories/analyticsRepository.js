const pool = require('../config/db');

async function recordClick({ urlId, ipAddress, referrer, userAgent, deviceType, browser }) {
  await pool.query(
    `INSERT INTO click_events (url_id, ip_address, referrer, user_agent, device_type, browser)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [urlId, ipAddress, referrer, userAgent, deviceType, browser]
  );
}

async function totalClicks(urlId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM click_events WHERE url_id = $1`,
    [urlId]
  );
  return rows[0].total;
}

async function dailyClicks(urlId, days = 30) {
  const { rows } = await pool.query(
    `SELECT date_trunc('day', clicked_at) AS day, COUNT(*)::int AS clicks
     FROM click_events
     WHERE url_id = $1 AND clicked_at > now() - ($2 || ' days')::interval
     GROUP BY day ORDER BY day ASC`,
    [urlId, days]
  );
  return rows;
}

async function topReferrers(urlId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*)::int AS clicks
     FROM click_events WHERE url_id = $1
     GROUP BY referrer ORDER BY clicks DESC LIMIT $2`,
    [urlId, limit]
  );
  return rows;
}

async function topDevices(urlId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT COALESCE(device_type, 'unknown') AS device_type, COUNT(*)::int AS clicks
     FROM click_events WHERE url_id = $1
     GROUP BY device_type ORDER BY clicks DESC LIMIT $2`,
    [urlId, limit]
  );
  return rows;
}

module.exports = { recordClick, totalClicks, dailyClicks, topReferrers, topDevices };
