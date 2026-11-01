const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const logger = require('../utils/logger');

const DB_DIR = path.resolve(__dirname, '../../../database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'historical_trading.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    -- 1. Indices & Commodities Historical Data (1m & 3m, Spot & Futures)
    CREATE TABLE IF NOT EXISTS index_commodity_historical (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,                -- 'NIFTY', 'CRUDEOIL'
      instrument_type TEXT NOT NULL,       -- 'SPOT', 'FUTURES'
      timeframe TEXT NOT NULL,             -- '1m', '3m'
      timestamp INTEGER NOT NULL,          -- Unix epoch in seconds
      datetime_str TEXT NOT NULL,          -- IST / ISO string (YYYY-MM-DD HH:MM:SS)
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER NOT NULL,
      oi INTEGER DEFAULT 0,
      CONSTRAINT unq_index_candle UNIQUE(symbol, instrument_type, timeframe, timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_idx_comm_sym_tf_ts 
      ON index_commodity_historical(symbol, instrument_type, timeframe, timestamp);
    CREATE INDEX IF NOT EXISTS idx_idx_comm_ts 
      ON index_commodity_historical(timestamp);

    -- 2. Options Historical Data (Nifty & Crude Oil, 1m & 3m, CE & PE across strikes)
    CREATE TABLE IF NOT EXISTS options_historical (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      underlying TEXT NOT NULL,            -- 'NIFTY', 'CRUDEOIL'
      strike REAL NOT NULL,
      expiry TEXT NOT NULL,                -- 'YYYY-MM-DD'
      option_type TEXT NOT NULL,           -- 'CE', 'PE'
      timeframe TEXT NOT NULL,             -- '1m', '3m'
      timestamp INTEGER NOT NULL,          -- Unix epoch in seconds
      datetime_str TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER NOT NULL,
      oi INTEGER NOT NULL,
      iv REAL NOT NULL,
      CONSTRAINT unq_opt_candle UNIQUE(underlying, strike, expiry, option_type, timeframe, timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_options_lookup 
      ON options_historical(underlying, strike, option_type, timeframe, timestamp);
    CREATE INDEX IF NOT EXISTS idx_options_expiry 
      ON options_historical(underlying, expiry, timeframe);

    -- 3. Equities Historical Data (Daily Granularity Only, Cash & Stock Futures, NO options)
    CREATE TABLE IF NOT EXISTS equities_daily_historical (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,                -- 'RELIANCE', 'TCS', 'HDFCBANK', etc.
      exchange TEXT NOT NULL,              -- 'NSE', 'BSE'
      instrument_type TEXT NOT NULL,       -- 'CASH', 'FUTURES'
      trade_date TEXT NOT NULL,            -- 'YYYY-MM-DD'
      timestamp INTEGER NOT NULL,          -- Unix epoch for 15:30 IST close
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER NOT NULL,
      delivery_qty INTEGER DEFAULT 0,
      delivery_pct REAL DEFAULT 0.0,
      CONSTRAINT unq_equity_daily UNIQUE(symbol, instrument_type, trade_date)
    );

    CREATE INDEX IF NOT EXISTS idx_equities_sym_date 
      ON equities_daily_historical(symbol, trade_date);
    CREATE INDEX IF NOT EXISTS idx_equities_ts 
      ON equities_daily_historical(timestamp);

    -- 4. Ingestion & Pipeline Metadata
    CREATE TABLE IF NOT EXISTS historical_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Query historical candles for indices & commodities
 */
function queryIndexCommodityCandles({
  symbol = 'NIFTY',
  instrumentType = 'SPOT',
  timeframe = '1m',
  fromTs = null,
  toTs = null,
  limit = 1000,
}) {
  const db = getDb();
  let sql = `
    SELECT timestamp as time, datetime_str, open, high, low, close, volume, oi
    FROM index_commodity_historical
    WHERE symbol = ? AND instrument_type = ? AND timeframe = ?
  `;
  const params = [symbol.toUpperCase(), instrumentType.toUpperCase(), timeframe];

  if (fromTs) {
    sql += ` AND timestamp >= ?`;
    params.push(Number(fromTs));
  }
  if (toTs) {
    sql += ` AND timestamp <= ?`;
    params.push(Number(toTs));
  }

  sql += ` ORDER BY timestamp ASC LIMIT ?`;
  params.push(Math.min(10000, parseInt(limit) || 1000));

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Query historical options data
 */
function queryHistoricalOptions({
  underlying = 'NIFTY',
  strike = null,
  optionType = null,
  expiry = null,
  timeframe = '1m',
  fromTs = null,
  toTs = null,
  limit = 1000,
}) {
  const db = getDb();
  let sql = `
    SELECT timestamp as time, datetime_str, strike, expiry, option_type, open, high, low, close, volume, oi, iv
    FROM options_historical
    WHERE underlying = ? AND timeframe = ?
  `;
  const params = [underlying.toUpperCase(), timeframe];

  if (strike) {
    sql += ` AND strike = ?`;
    params.push(Number(strike));
  }
  if (optionType) {
    sql += ` AND option_type = ?`;
    params.push(optionType.toUpperCase());
  }
  if (expiry) {
    sql += ` AND expiry = ?`;
    params.push(expiry);
  }
  if (fromTs) {
    sql += ` AND timestamp >= ?`;
    params.push(Number(fromTs));
  }
  if (toTs) {
    sql += ` AND timestamp <= ?`;
    params.push(Number(toTs));
  }

  sql += ` ORDER BY timestamp ASC LIMIT ?`;
  params.push(Math.min(10000, parseInt(limit) || 1000));

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Query equities daily historical data
 */
function queryDailyEquities({
  symbol = 'RELIANCE',
  instrumentType = 'CASH',
  fromDate = null,
  toDate = null,
  limit = 1000,
}) {
  const db = getDb();
  let sql = `
    SELECT timestamp as time, trade_date, symbol, exchange, instrument_type, open, high, low, close, volume, delivery_qty, delivery_pct
    FROM equities_daily_historical
    WHERE symbol = ? AND instrument_type = ?
  `;
  const params = [symbol.toUpperCase(), instrumentType.toUpperCase()];

  if (fromDate) {
    sql += ` AND trade_date >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    sql += ` AND trade_date <= ?`;
    params.push(toDate);
  }

  sql += ` ORDER BY trade_date ASC LIMIT ?`;
  params.push(Math.min(2000, parseInt(limit) || 1000));

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Get comprehensive statistics of the historical SQL database
 */
function getDbStats() {
  const db = getDb();

  const idxCommStats = db.prepare(`
    SELECT 
      symbol, 
      instrument_type, 
      timeframe, 
      COUNT(*) as count, 
      MIN(datetime_str) as earliest, 
      MAX(datetime_str) as latest
    FROM index_commodity_historical
    GROUP BY symbol, instrument_type, timeframe
  `).all();

  const optStats = db.prepare(`
    SELECT 
      underlying, 
      timeframe, 
      COUNT(DISTINCT strike) as strikes_count, 
      COUNT(*) as count, 
      MIN(datetime_str) as earliest, 
      MAX(datetime_str) as latest
    FROM options_historical
    GROUP BY underlying, timeframe
  `).all();

  const equityStats = db.prepare(`
    SELECT 
      symbol, 
      instrument_type, 
      COUNT(*) as count, 
      MIN(trade_date) as earliest, 
      MAX(trade_date) as latest
    FROM equities_daily_historical
    GROUP BY symbol, instrument_type
  `).all();

  let fileSizeMb = 0;
  if (fs.existsSync(DB_PATH)) {
    const stat = fs.statSync(DB_PATH);
    fileSizeMb = Number((stat.size / (1024 * 1024)).toFixed(2));
  }

  const metaRows = db.prepare('SELECT key, value, updated_at FROM historical_meta').all();
  const metadata = {};
  metaRows.forEach(r => { metadata[r.key] = { value: r.value, updatedAt: r.updated_at }; });

  return {
    dbPath: DB_PATH,
    fileSizeMb,
    indexCommodity: idxCommStats,
    options: optStats,
    equities: equityStats,
    metadata,
  };
}

module.exports = {
  DB_PATH,
  getDb,
  queryIndexCommodityCandles,
  queryHistoricalOptions,
  queryDailyEquities,
  getDbStats,
};

