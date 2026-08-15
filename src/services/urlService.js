const urlRepository = require('../repositories/urlRepository');
const urlCache = require('../cache/urlCache');
const base62 = require('../utils/base62');

const {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} = require('../utils/errors');

// Reserved short codes we don't want colliding with real routes/branding.
const RESERVED = new Set([
  'api',
  'admin',
  'health',
  'auth',
  'urls',
  'analytics',
]);

async function createShortUrl({
  longUrl,
  customAlias,
  expiresAt,
  ownerId,
}) {
  if (customAlias) {
    const normalizedAlias = customAlias.trim();

    if (RESERVED.has(normalizedAlias.toLowerCase())) {
      throw new BadRequestError('This alias is reserved');
    }

    const existing = await urlRepository.findByAlias(
      normalizedAlias
    );

    if (existing) {
      throw new ConflictError(
        'This alias is already taken'
      );
    }

    customAlias = normalizedAlias;
  }

  /*
   * PostgreSQL gives us a concurrency-safe sequence ID.
   *
   * We use that ID to deterministically generate the Base62
   * short code BEFORE inserting the URL.
   *
   * There is no temporary "pending" row anymore.
   */
  const id = await urlRepository.getNextId();

  const shortCode = base62.encode(id);

  try {
    return await urlRepository.createUrl({
      longUrl,
      ownerId,
      expiresAt,
      shortCode,
      customAlias: customAlias || null,
    });
  } catch (err) {
    /*
     * The database UNIQUE constraint remains the final authority
     * against duplicate aliases.
     *
     * This also protects us against two concurrent requests trying
     * to create the same custom alias.
     */
    if (
      err.code === '23505' &&
      customAlias
    ) {
      throw new ConflictError(
        'This alias is already taken'
      );
    }

    throw err;
  }
}

// ============================================================
// REDIRECT RESOLUTION
// ============================================================

async function resolveUrl(code) {
  const cached = await urlCache.get(code);

  if (cached) {
    // Check cached state as well.
    // This prevents inactive/expired links from being served
    // if stale data somehow remains in Redis.
    if (!cached.is_active) {
      throw new NotFoundError(
        'Short URL not found'
      );
    }

    if (
      cached.expires_at &&
      new Date(cached.expires_at) < new Date()
    ) {
      await urlCache.invalidate(code);

      throw new NotFoundError(
        'This link has expired'
      );
    }

    return cached;
  }

  const row =
    await urlRepository.findByShortCodeOrAlias(code);

  if (!row || !row.is_active) {
    throw new NotFoundError(
      'Short URL not found'
    );
  }

  if (
    row.expires_at &&
    new Date(row.expires_at) < new Date()
  ) {
    throw new NotFoundError(
      'This link has expired'
    );
  }

  await urlCache.set(code, row);

  return row;
}

// ============================================================
// OWNERSHIP
// ============================================================

async function getUrlOwnedBy(id, userId) {
  const row = await urlRepository.findById(id);

  if (!row) {
    throw new NotFoundError('URL not found');
  }

  if (Number(row.owner_id) !== Number(userId)) {
    throw new ForbiddenError(
      'You do not own this URL'
    );
  }

  return row;
}

// ============================================================
// DELETE
// ============================================================

async function deleteUrl(id, userId) {
  const row = await getUrlOwnedBy(id, userId);

  await urlRepository.softDelete(id);

  // Invalidate both possible redirect keys.
  await urlCache.invalidate(row.short_code);

  if (row.custom_alias) {
    await urlCache.invalidate(
      row.custom_alias
    );
  }
}

// ============================================================
// LIST
// ============================================================

async function listUrlsForOwner(
  ownerId,
  pagination
) {
  return urlRepository.findByOwner(
    ownerId,
    pagination
  );
}

module.exports = {
  createShortUrl,
  resolveUrl,
  getUrlOwnedBy,
  deleteUrl,
  listUrlsForOwner,
};