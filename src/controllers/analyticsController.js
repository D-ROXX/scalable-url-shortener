const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');

async function getSummary(req, res) {
  const urlId = Number(req.params.id);

  // Validate URL ID
  if (!Number.isInteger(urlId) || urlId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid URL id',
      },
    });
  }

  // ----------------------------------------------------------
  // Ownership check
  // ----------------------------------------------------------

  if (req.user.role !== 'admin') {
    await urlService.getUrlOwnedBy(
      urlId,
      req.user.id
    );
  }

  // ----------------------------------------------------------
  // Date range
  // ----------------------------------------------------------

  const requestedDays = Number(
    req.query.days
  );

  const days = [7, 30, 90].includes(
    requestedDays
  )
    ? requestedDays
    : 30;

  // ----------------------------------------------------------
  // Analytics
  // ----------------------------------------------------------

  const summary =
    await analyticsService.getSummary(
      urlId,
      days
    );

  return res.status(200).json({
    success: true,

    data: summary,
  });
}

module.exports = {
  getSummary,
};