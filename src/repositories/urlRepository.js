const pool = require('../config/db');

async function createUrl({
  longUrl,
  ownerId,
  expiresAt,
  shortCode,
  customAlias = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO urls (
       short_code,
       long_url,
       owner_id,
       expires_at,
       custom_alias
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      shortCode,
      longUrl,
      ownerId,
      expiresAt || null,
      customAlias,
    ]
  );

  return rows[0];
}

// Gets the next PostgreSQL sequence value without creating a
// temporary/pending URL row.
//
// Sequence gaps are completely acceptable. PostgreSQL sequences
// are designed to be concurrency-safe and do not guarantee gapless IDs.
async function getNextId() {
  const { rows } = await pool.query(
    `SELECT nextval(pg_get_serial_sequence('urls', 'id')) AS id`
  );

  return Number(rows[0].id);
}

async function findByShortCodeOrAlias(code) {
  const { rows } = await pool.query(
    `SELECT *
     FROM urls
     WHERE short_code = $1
        OR custom_alias = $1
     LIMIT 1`,
    [code]
  );

  return rows[0] || null;
}

async function findByAlias(alias) {
  const { rows } = await pool.query(
    `SELECT id
     FROM urls
     WHERE custom_alias = $1`,
    [alias]
  );

  return rows[0] || null;
}

async function findByOwner(
  ownerId,
  { limit = 20, offset = 0 } = {}
) {
  const { rows } = await pool.query(
    `SELECT *
     FROM urls
     WHERE owner_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [ownerId, limit, offset]
  );

  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT *
     FROM urls
     WHERE id = $1`,
    [id]
  );

  return rows[0] || null;
}

async function softDelete(id) {
  await pool.query(
    `UPDATE urls
     SET is_active = false,
         updated_at = now()
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  createUrl,
  getNextId,
  findByShortCodeOrAlias,
  findByAlias,
  findByOwner,
  findById,
  softDelete,
};