const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');

const {
  BadRequestError,
} = require('../utils/errors');

/* ============================================================
   CREATE URL
============================================================ */

async function createUrl(req, res) {
  const {
    longUrl,
    customAlias,
    expiresAt,
  } = req.body;

  const row =
    await urlService.createShortUrl({
      longUrl,
      customAlias,
      expiresAt,
      ownerId: req.user.id,
    });

  const shortCode =
    row.custom_alias ||
    row.short_code;

  const baseUrl =
    String(
      process.env.BASE_URL || ''
    ).replace(/\/+$/, '');

  res.status(201).json({
    success: true,

    data: {
      id: row.id,

      shortUrl:
        `${baseUrl}/${shortCode}`,

      longUrl:
        row.long_url,

      shortCode:
        row.short_code,

      customAlias:
        row.custom_alias,

      createdAt:
        row.created_at,

      expiresAt:
        row.expires_at,
    },
  });
}

/* ============================================================
   LIST URLS
============================================================ */

async function listUrls(req, res) {
  const parsedLimit =
    Number(req.query.limit);

  const parsedOffset =
    Number(req.query.offset);

  const limit =
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;

  const offset =
    Number.isInteger(parsedOffset) &&
    parsedOffset >= 0
      ? parsedOffset
      : 0;

  const rows =
    await urlService.listUrlsForOwner(
      req.user.id,
      {
        limit,
        offset,
      }
    );

  res.status(200).json({
    success: true,
    data: rows,
  });
}

/* ============================================================
   DELETE URL
============================================================ */

async function deleteUrl(req, res) {
  const id =
    Number(req.params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new BadRequestError(
      'Invalid URL id'
    );
  }

  await urlService.deleteUrl(
    id,
    req.user.id
  );

  res.status(204).send();
}

/* ============================================================
   REDIRECT
============================================================ */

/*
 * Hot path:
 *
 * GET /:shortCode
 *
 * Redis → PostgreSQL fallback
 *          ↓
 * fire analytics asynchronously
 *          ↓
 * redirect immediately
 */

async function redirect(req, res) {
  const code =
    String(
      req.params.shortCode || ''
    ).trim();

  if (!code) {
    throw new BadRequestError(
      'Short code is required'
    );
  }

  const row =
    await urlService.resolveUrl(
      code
    );

  /*
   * Do not await analytics.
   * Redirect latency should not depend on
   * click-event database writes.
   */
  analyticsService.recordClickAsync(
    req,
    row.id
  );

  return res.redirect(
    302,
    row.long_url
  );
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  createUrl,
  listUrls,
  deleteUrl,
  redirect,
};