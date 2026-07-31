-- ============================================================
-- NIFTY OPTIONS AI TRADING PLATFORM — MySQL Schema
-- ============================================================
-- Run: mysql -u root -p nifty_trading < schema.sql

CREATE DATABASE IF NOT EXISTS nifty_trading CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nifty_trading;

-- ─── Option Ticks ────────────────────────────────────────────
-- Stores periodic snapshots of option chain data.
-- Raw tick buffer lives in memory (tickBuffer.js).
CREATE TABLE IF NOT EXISTS option_ticks (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  security_id VARCHAR(20)      NOT NULL,
  symbol      VARCHAR(50)      NOT NULL,
  strike      INT              NOT NULL,
  expiry      DATE             NOT NULL,
  type        ENUM('CE','PE')  NOT NULL,
  ltp         DECIMAL(10,2)    DEFAULT 0,
  atp         DECIMAL(10,2)    DEFAULT 0,
  volume      BIGINT           DEFAULT 0,
  oi          BIGINT           DEFAULT 0,
  oi_change   BIGINT           DEFAULT 0,
  iv          DECIMAL(6,2)     DEFAULT 0,
  delta       DECIMAL(7,4)     DEFAULT 0,
  gamma       DECIMAL(10,6)    DEFAULT 0,
  theta       DECIMAL(7,4)     DEFAULT 0,
  vega        DECIMAL(7,4)     DEFAULT 0,
  bid         DECIMAL(10,2)    DEFAULT 0,
  ask         DECIMAL(10,2)    DEFAULT 0,
  timestamp   DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_symbol_ts (symbol, timestamp),
  INDEX idx_strike_expiry (strike, expiry, type)
) ENGINE=InnoDB;

-- ─── Index Ticks ─────────────────────────────────────────────
-- Nifty spot price tick history.
CREATE TABLE IF NOT EXISTS index_ticks (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol          VARCHAR(20)   NOT NULL DEFAULT 'NIFTY',
  ltp             DECIMAL(10,2) NOT NULL,
  change_points   DECIMAL(10,2) DEFAULT 0,
  change_percent  DECIMAL(6,2)  DEFAULT 0,
  high            DECIMAL(10,2) DEFAULT 0,
  low             DECIMAL(10,2) DEFAULT 0,
  volume          BIGINT        DEFAULT 0,
  timestamp       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_ts (timestamp)
) ENGINE=InnoDB;

-- ─── Option Chain Snapshots ──────────────────────────────────
-- Complete option chain snapshot, stored every 5 minutes.
CREATE TABLE IF NOT EXISTS option_chain_snapshots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  symbol          VARCHAR(20)   NOT NULL,
  expiry          DATE          NOT NULL,
  spot            DECIMAL(10,2) NOT NULL,
  atm_strike      INT           NOT NULL,
  pcr             DECIMAL(6,3)  DEFAULT 0,
  vix             DECIMAL(6,2)  DEFAULT 0,
  atm_ce_iv       DECIMAL(6,2)  DEFAULT 0,
  atm_pe_iv       DECIMAL(6,2)  DEFAULT 0,
  chain_json      LONGTEXT,     -- Full chain as JSON
  snapshot_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_snap (symbol, snapshot_at)
) ENGINE=InnoDB;

-- ─── AI Signals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  generated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  strategy          VARCHAR(100)   NOT NULL,
  direction         ENUM('BULLISH','BEARISH','NEUTRAL','SIDEWAYS') NOT NULL,
  strike_entry      INT,
  expiry            DATE,
  confidence        DECIMAL(5,2)   DEFAULT 0,
  gemini_reasoning  TEXT,
  raw_signal        LONGTEXT,      -- Full Gemini JSON response
  status            ENUM('PENDING','EXECUTED','REJECTED','EXPIRED','CANCELLED') DEFAULT 'PENDING',
  executed_at       DATETIME,
  rejected_reason   VARCHAR(255),
  INDEX idx_status (status),
  INDEX idx_generated (generated_at)
) ENGINE=InnoDB;

-- ─── Trades ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  signal_id       INT,
  dhan_order_id   VARCHAR(50),
  symbol          VARCHAR(50)      NOT NULL,
  strike          INT,
  expiry          DATE,
  type            ENUM('CE','PE'),
  action          ENUM('BUY','SELL') NOT NULL,
  qty             INT              NOT NULL,
  lots            INT              DEFAULT 1,
  entry_price     DECIMAL(10,2)    DEFAULT 0,
  exit_price      DECIMAL(10,2)    DEFAULT 0,
  entry_time      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time       DATETIME,
  entry_iv        DECIMAL(6,2)     DEFAULT 0,
  exit_iv         DECIMAL(6,2)     DEFAULT 0,
  entry_delta     DECIMAL(7,4)     DEFAULT 0,
  exit_delta      DECIMAL(7,4)     DEFAULT 0,
  pnl             DECIMAL(10,2)    DEFAULT 0,
  charges         DECIMAL(10,2)    DEFAULT 0,
  net_pnl         DECIMAL(10,2)    DEFAULT 0,
  status          ENUM('OPEN','CLOSED','CANCELLED') DEFAULT 'OPEN',
  notes           TEXT,
  FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_date (entry_time)
) ENGINE=InnoDB;

-- ─── Daily P&L ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnl_daily (
  trade_date      DATE             PRIMARY KEY,
  gross_pnl       DECIMAL(10,2)    DEFAULT 0,
  charges         DECIMAL(10,2)    DEFAULT 0,
  net_pnl         DECIMAL(10,2)    DEFAULT 0,
  winning_trades  INT              DEFAULT 0,
  losing_trades   INT              DEFAULT 0,
  max_drawdown    DECIMAL(10,2)    DEFAULT 0,
  starting_capital DECIMAL(12,2)   DEFAULT 0,
  notes           TEXT
) ENGINE=InnoDB;

-- ─── Strategy Configs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategy_configs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)     NOT NULL UNIQUE,
  enabled         TINYINT(1)       DEFAULT 1,
  config_json     TEXT,
  created_at      DATETIME         DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── System Events (Audit Log) ────────────────────────────────
CREATE TABLE IF NOT EXISTS system_events (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type  VARCHAR(50)   NOT NULL,
  level       ENUM('INFO','WARN','ERROR','CRITICAL') DEFAULT 'INFO',
  message     TEXT,
  payload     LONGTEXT,
  created_at  DATETIME(3)   DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_type (event_type),
  INDEX idx_level (level)
) ENGINE=InnoDB;

-- ─── Seed Default Strategies ─────────────────────────────────
INSERT IGNORE INTO strategy_configs (name, enabled, config_json) VALUES
('Iron Condor', 1, '{"maxLoss":3000,"targetProfit":1500,"deltaRange":[0.15,0.25]}'),
('Bull Call Spread', 1, '{"maxLoss":2000,"targetProfit":2000}'),
('Bear Put Spread', 1, '{"maxLoss":2000,"targetProfit":2000}'),
('OI Reversal Scalp', 1, '{"maxLoss":1500,"targetProfit":1500,"stopLossPoints":30}'),
('Straddle Buy', 0, '{"maxLoss":4000,"targetProfit":5000}');
