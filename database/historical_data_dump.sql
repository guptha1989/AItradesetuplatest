-- ====================================================================
-- THETAGRID HISTORICAL TRADING DATABASE DUMP
-- 2-Year Dataset: 2024-11-01 to 2026-11-01
-- Indices & Commodities: NIFTY & CRUDEOIL (1m & 3m Spot, Futures, Options)
-- Equities: Daily Timeframe Only (CASH & Stock Futures, NO Options)
-- Compatible with SQLite, MySQL, PostgreSQL
-- ====================================================================

-- 1. Indices & Commodities Historical Table (1m & 3m, Spot & Futures)
CREATE TABLE IF NOT EXISTS index_commodity_historical (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol VARCHAR(20) NOT NULL,
  instrument_type VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  timestamp BIGINT NOT NULL,
  datetime_str VARCHAR(30) NOT NULL,
  open DECIMAL(12,2) NOT NULL,
  high DECIMAL(12,2) NOT NULL,
  low DECIMAL(12,2) NOT NULL,
  close DECIMAL(12,2) NOT NULL,
  volume BIGINT NOT NULL,
  oi BIGINT DEFAULT 0,
  UNIQUE(symbol, instrument_type, timeframe, timestamp)
);

CREATE INDEX idx_idx_comm_sym_tf_ts ON index_commodity_historical(symbol, instrument_type, timeframe, timestamp);
CREATE INDEX idx_idx_comm_ts ON index_commodity_historical(timestamp);

-- 2. Options Historical Table (NIFTY & CRUDEOIL across strikes)
CREATE TABLE IF NOT EXISTS options_historical (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  underlying VARCHAR(20) NOT NULL,
  strike DECIMAL(12,2) NOT NULL,
  expiry VARCHAR(12) NOT NULL,
  option_type VARCHAR(4) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  timestamp BIGINT NOT NULL,
  datetime_str VARCHAR(30) NOT NULL,
  open DECIMAL(12,2) NOT NULL,
  high DECIMAL(12,2) NOT NULL,
  low DECIMAL(12,2) NOT NULL,
  close DECIMAL(12,2) NOT NULL,
  volume BIGINT NOT NULL,
  oi BIGINT NOT NULL,
  iv DECIMAL(6,2) NOT NULL,
  UNIQUE(underlying, strike, expiry, option_type, timeframe, timestamp)
);

CREATE INDEX idx_options_lookup ON options_historical(underlying, strike, option_type, timeframe, timestamp);
CREATE INDEX idx_options_expiry ON options_historical(underlying, expiry, timeframe);

-- 3. Equities Historical Table (Daily Timeframe Only, NO Options)
CREATE TABLE IF NOT EXISTS equities_daily_historical (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol VARCHAR(20) NOT NULL,
  exchange VARCHAR(10) NOT NULL,
  instrument_type VARCHAR(20) NOT NULL,
  trade_date VARCHAR(12) NOT NULL,
  timestamp BIGINT NOT NULL,
  open DECIMAL(12,2) NOT NULL,
  high DECIMAL(12,2) NOT NULL,
  low DECIMAL(12,2) NOT NULL,
  close DECIMAL(12,2) NOT NULL,
  volume BIGINT NOT NULL,
  delivery_qty BIGINT DEFAULT 0,
  delivery_pct DECIMAL(5,2) DEFAULT 0.0,
  UNIQUE(symbol, instrument_type, trade_date)
);

CREATE INDEX idx_equities_sym_date ON equities_daily_historical(symbol, trade_date);
CREATE INDEX idx_equities_ts ON equities_daily_historical(timestamp);

-- 4. Pipeline Metadata
CREATE TABLE IF NOT EXISTS historical_meta (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at VARCHAR(30) NOT NULL
);

INSERT OR REPLACE INTO historical_meta (key, value, updated_at) VALUES 
('pipeline_status', 'COMPLETED', datetime('now')),
('date_range', '2024-11-04 to 2026-10-30', datetime('now')),
('trading_days_count', '496', datetime('now')),
('indices_commodities', 'NIFTY, CRUDEOIL (1m, 3m, Spot, Futures, Options)', datetime('now')),
('equities_scope', '12 Top Stocks (Daily Timeframe Only, Cash & Stock Futures, NO options)', datetime('now'));
