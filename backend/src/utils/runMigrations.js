/**
 * Lightweight migration runner.
 * Called at server startup — idempotent (IF NOT EXISTS / ALTER IGNORE).
 */
const fs   = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../models/migrations');

const run = async () => {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const conn = await pool.getConnection();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      // Split on semicolons to support multi-statement files
      const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await conn.execute(stmt);
      }
      console.log(`[Migration] ✓ ${file}`);
    }
  } finally {
    conn.release();
  }
};

module.exports = { run };
