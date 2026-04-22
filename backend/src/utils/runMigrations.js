/**
 * Migration runner — tracks executed files in schema_migrations table.
 * Safe to run on every startup: skips already-applied migrations.
 */
const fs   = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../models/migrations');

const run = async () => {
  const conn = await pool.getConnection();
  try {
    // Tracking table — idempotent
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        run_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const [rows] = await conn.execute(
        'SELECT filename FROM schema_migrations WHERE filename = ?',
        [file]
      );
      if (rows.length) {
        // Already applied on a previous startup
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        await conn.execute(stmt);
      }

      await conn.execute(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [file]
      );
      console.log(`[Migration] ✓ ${file}`);
    }
  } finally {
    conn.release();
  }
};

module.exports = { run };
