const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config.db);
    logger.info('MySQL connection pool created');
  }
  return pool;
}

let dbAvailable = true;

async function query(sql, params = []) {
  if (!dbAvailable) return [];
  try {
    const conn = getPool();
    const [rows] = await conn.execute(sql, params);
    return rows;
  } catch (err) {
    // If connection refused, mark DB as unavailable to avoid memory leaks
    if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      dbAvailable = false;
      logger.warn(`MySQL server not reachable (${err.code}). Using in-memory fallback.`);
    } else {
      logger.error(`DB query error: ${err.message}`);
    }
    return [];
  }
}

async function testConnection() {
  try {
    const conn = getPool();
    await conn.execute('SELECT 1');
    logger.info('✅ MySQL connection verified');
    dbAvailable = true;
    return true;
  } catch (err) {
    dbAvailable = false;
    logger.warn('⚠️ MySQL not reachable. Using in-memory mode.');
    return false;
  }
}

module.exports = { getPool, query, testConnection };
