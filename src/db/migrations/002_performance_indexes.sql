-- ============================================================
-- Performance indexes
-- ============================================================

-- Dashboard:
-- WHERE owner_id = ?
-- ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_urls_owner_created_at
ON urls (owner_id, created_at DESC);


-- Redirect resolution:
-- short_code is already UNIQUE, so PostgreSQL already
-- maintains a unique index for it.


-- Custom alias lookup:
-- custom_alias is already UNIQUE, so PostgreSQL already
-- maintains a unique index for it.


-- Analytics:
-- Existing composite index already supports:
-- WHERE url_id = ?
-- ORDER BY / filtering by clicked_at
--
-- No duplicate analytics index is added here.