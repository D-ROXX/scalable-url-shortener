const pool = require('../config/db');

async function insertPending(longUrl, ownerId, expiresAt) {
  // Two-step insert: we need the auto-increment id BEFORE we can compute
  // its Base62 short_code, so we insert with a temporary placeholder,
  // then update it in the same transaction once we have the id.
  const { rows } = await pool.query(
    `INSERT INTO urls (short_code, long_url, owner_id, expires_at)
     VALUES ('pending', $1, $2, $3)
     RETURNING id`,
    [longUrl, ownerId, expiresAt || null]
  );
  return rows[0].id;
}

async function setShortCode(id, shortCode) {
  const { rows } = await pool.query(
    `UPDATE urls SET short_code = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [shortCode, id]
  );
  return rows[0];
}

async function findByShortCodeOrAlias(code) {
  const { rows } = await pool.query(
    `SELECT * FROM urls WHERE short_code = $1 OR custom_alias = $1 LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function findByAlias(alias) {
  const { rows } = await pool.query(`SELECT id FROM urls WHERE custom_alias = $1`, [alias]);
  return rows[0] || null;
}

async function setCustomAlias(id, alias) {
  const { rows } = await pool.query(
    `UPDATE urls SET custom_alias = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [alias, id]
  );
  return rows[0];
}

async function findByOwner(ownerId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM urls WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [ownerId, limit, offset]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM urls WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function softDelete(id) {
  await pool.query(`UPDATE urls SET is_active = false, updated_at = now() WHERE id = $1`, [id]);
}

module.exports = {
  insertPending,
  setShortCode,
  findByShortCodeOrAlias,
  findByAlias,
  setCustomAlias,
  findByOwner,
  findById,
  softDelete,
};
