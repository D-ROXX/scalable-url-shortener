const analyticsRepository = require('../repositories/analyticsRepository');
const logger = require('../utils/logger');

// Lightweight User-Agent parser
function parseUserAgent(ua = '') {
  const deviceType = /mobile/i.test(ua)
    ? 'mobile'
    : 'desktop';

  let browser = 'other';

  if (/edg/i.test(ua)) {
    browser = 'edge';
  } else if (/chrome/i.test(ua)) {
    browser = 'chrome';
  } else if (/firefox/i.test(ua)) {
    browser = 'firefox';
  } else if (/safari/i.test(ua)) {
    browser = 'safari';
  }

  return {
    deviceType,
    browser,
  };
}

// Fire-and-forget analytics recording.
// Redirect request ko analytics database write ke liye wait nahi karna padega.
function recordClickAsync(req, urlId) {
  const {
    deviceType,
    browser,
  } = parseUserAgent(
    req.headers['user-agent']
  );

  analyticsRepository
    .recordClick({
      urlId,
      ipAddress: req.ip,
      referrer:
        req.headers.referer || null,
      userAgent:
        req.headers['user-agent'] || null,
      deviceType,
      browser,
    })
    .catch((err) => {
      logger.error(
        'Failed to record click event',
        {
          message: err.message,
        }
      );
    });
}

// Get analytics summary.
// Supported ranges: 7, 30, 90 days.
async function getSummary(
  urlId,
  days = 30
) {
  const safeDays = [7, 30, 90].includes(
    Number(days)
  )
    ? Number(days)
    : 30;

  const [
    total,
    daily,
    referrers,
    devices,
  ] = await Promise.all([
    analyticsRepository.totalClicks(
      urlId
    ),

    analyticsRepository.dailyClicks(
      urlId,
      safeDays
    ),

    analyticsRepository.topReferrers(
      urlId
    ),

    analyticsRepository.topDevices(
      urlId
    ),
  ]);

  return {
    totalClicks: total,

    days: safeDays,

    dailyClicks: daily,

    topReferrers: referrers,

    topDevices: devices,
  };
}

module.exports = {
  recordClickAsync,
  getSummary,
};