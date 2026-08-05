const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');

async function getSummary(req, res) {
  const urlId = Number(req.params.id);
  // Ownership check first — analytics for a URL should only be visible
  // to the URL's owner (or an admin).
  if (req.user.role !== 'admin') {
    await urlService.getUrlOwnedBy(urlId, req.user.id);
  }
  const summary = await analyticsService.getSummary(urlId);
  res.status(200).json({ success: true, data: summary });
}

module.exports = { getSummary };
