const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function migrate() {
  logger.info('Running database migration...');
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  // Split on semicolons, filter empty
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (err) {
      logger.error(`Migration statement failed: ${err.message}\nSQL: ${stmt.slice(0, 100)}`);
    }
  }

  logger.info('✅ Database migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
