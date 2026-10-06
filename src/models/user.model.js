const { getMySQLPool } = require('../config/database');

async function findByEmail(email) {
  const pool = await getMySQLPool();
  if (!pool) {
    return null;
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const pool = await getMySQLPool();
  if (!pool) {
    return null;
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(id)]);
  return rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
};
