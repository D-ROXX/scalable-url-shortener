const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');

async function createUrl(req, res) {
  const { longUrl, customAlias, expiresAt } = req.body;
  const row = await urlService.createShortUrl({
    longUrl,
    customAlias,
    expiresAt,
    ownerId: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: {
      id: row.id,
      shortUrl: `${process.env.BASE_URL}/${row.custom_alias || row.short_code}`,
      longUrl: row.long_url,
      shortCode: row.short_code,
      customAlias: row.custom_alias,
      createdAt: row.created_at,
    },
  });
}

async function listUrls(req, res) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const rows = await urlService.listUrlsForOwner(req.user.id, { limit, offset });
  res.status(200).json({ success: true, data: rows });
}

async function deleteUrl(req, res) {
  await urlService.deleteUrl(Number(req.params.id), req.user.id);
  res.status(204).send();
}

// The hot path: GET /:shortCode. Optimized for latency — resolve from
// cache-aside, fire analytics without awaiting, redirect immediately.
async function redirect(req, res) {
  const row = await urlService.resolveUrl(req.params.shortCode);
  analyticsService.recordClickAsync(req, row.id);
  res.redirect(302, row.long_url);
}

module.exports = { createUrl, listUrls, deleteUrl, redirect };
