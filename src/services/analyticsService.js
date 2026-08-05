const analyticsRepository = require('../repositories/analyticsRepository');
const logger = require('../utils/logger');

// Very lightweight UA parsing without a heavy dependency — good enough to
// bucket "mobile vs desktop" and the major browser families for analytics.
function parseUserAgent(ua = '') {
  const deviceType = /mobile/i.test(ua) ? 'mobile' : 'desktop';
  let browser = 'other';
  if (/chrome/i.test(ua)) browser = 'chrome';
  else if (/firefox/i.test(ua)) browser = 'firefox';
  else if (/safari/i.test(ua)) browser = 'safari';
  else if (/edge/i.test(ua)) browser = 'edge';
  return { deviceType, browser };
}

// Fire-and-forget: the redirect endpoint calls this without awaiting so the
// user's redirect isn't held up by an analytics write. Errors are logged,
// never thrown, since a lost click event should never break a redirect.
function recordClickAsync(req, urlId) {
  const { deviceType, browser } = parseUserAgent(req.headers['user-agent']);
  analyticsRepository
    .recordClick({
      urlId,
      ipAddress: req.ip,
      referrer: req.headers.referer || null,
      userAgent: req.headers['user-agent'] || null,
      deviceType,
      browser,
    })
    .catch((err) => logger.error('Failed to record click event', { message: err.message }));
}

async function getSummary(urlId) {
  const [total, daily, referrers, devices] = await Promise.all([
    analyticsRepository.totalClicks(urlId),
    analyticsRepository.dailyClicks(urlId, 30),
    analyticsRepository.topReferrers(urlId),
    analyticsRepository.topDevices(urlId),
  ]);
  return { totalClicks: total, dailyClicks: daily, topReferrers: referrers, topDevices: devices };
}

module.exports = { recordClickAsync, getSummary };
