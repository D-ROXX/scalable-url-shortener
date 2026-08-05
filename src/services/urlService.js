const urlRepository = require('../repositories/urlRepository');
const urlCache = require('../cache/urlCache');
const base62 = require('../utils/base62');
const { NotFoundError, ConflictError, ForbiddenError, BadRequestError } = require('../utils/errors');

// Reserved short codes we don't want colliding with real routes/branding.
const RESERVED = new Set(['api', 'admin', 'health', 'auth', 'urls', 'analytics']);

async function createShortUrl({ longUrl, customAlias, expiresAt, ownerId }) {
  if (customAlias) {
    if (RESERVED.has(customAlias.toLowerCase())) {
      throw new BadRequestError('This alias is reserved');
    }
    const existing = await urlRepository.findByAlias(customAlias);
    if (existing) throw new ConflictError('This alias is already taken');
  }

  // Step 1: insert to get the auto-increment id.
  const id = await urlRepository.insertPending(longUrl, ownerId, expiresAt);
  // Step 2: derive the short_code deterministically from that id.
  const shortCode = base62.encode(id);
  let row = await urlRepository.setShortCode(id, shortCode);

  if (customAlias) {
    row = await urlRepository.setCustomAlias(id, customAlias);
  }

  return row;
}

// The core cache-aside read path used by the redirect endpoint.
async function resolveUrl(code) {
  const cached = await urlCache.get(code);
  if (cached) {
    return cached;
  }

  const row = await urlRepository.findByShortCodeOrAlias(code);
  if (!row || !row.is_active) {
    throw new NotFoundError('Short URL not found');
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new NotFoundError('This link has expired');
  }

  await urlCache.set(code, row);
  return row;
}

async function getUrlOwnedBy(id, userId) {
  const row = await urlRepository.findById(id);
  if (!row) throw new NotFoundError('URL not found');
  if (row.owner_id !== userId) throw new ForbiddenError('You do not own this URL');
  return row;
}

async function deleteUrl(id, userId) {
  const row = await getUrlOwnedBy(id, userId);
  await urlRepository.softDelete(id);
  await urlCache.invalidate(row.short_code);
  if (row.custom_alias) await urlCache.invalidate(row.custom_alias);
}

async function listUrlsForOwner(ownerId, pagination) {
  return urlRepository.findByOwner(ownerId, pagination);
}

module.exports = {
  createShortUrl,
  resolveUrl,
  getUrlOwnedBy,
  deleteUrl,
  listUrlsForOwner,
};
