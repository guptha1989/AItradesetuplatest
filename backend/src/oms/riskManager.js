const { query } = require('../config/db');
const { wsServer } = require('../websocket/wsServer');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Risk Manager — enforces all risk guardrails before any order is placed.
 * This is the safety layer of the OMS.
 */
class RiskManager {
  constructor() {
    this.dailyLoss = 0;
    this.openPositionCount = 0;
    this.tradingHalted = false;
    this.haltReason = null;
  }

  /**
   * Sync daily P&L and open position count from DB.
   * Should be called on startup and after every trade.
   */
  async sync() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's realized + unrealized P&L
      const pnlRows = await query(
        `SELECT COALESCE(SUM(pnl), 0) as totalPnl FROM trades WHERE DATE(entry_time) = ? AND status = 'CLOSED'`,
        [today]
      );
      this.dailyLoss = Math.min(0, parseFloat(pnlRows[0]?.totalPnl || 0));

      // Get open positions count
      const posRows = await query(
        `SELECT COUNT(*) as cnt FROM trades WHERE status = 'OPEN'`
      );
      this.openPositionCount = parseInt(posRows[0]?.cnt || 0);

      logger.debug(`Risk sync: dailyLoss=₹${this.dailyLoss}, openPositions=${this.openPositionCount}`);
    } catch (err) {
      logger.error('Risk sync failed:', err.message);
    }
  }

  /**
   * Check if a new order is permitted. Returns { allowed, reason }.
   * @param {object} order
   */
  async check(order) {
    // 1. Hard halt check
    if (this.tradingHalted) {
      return { allowed: false, reason: `Trading halted: ${this.haltReason}` };
    }

    // 2. Paper mode — always allow
    if (config.trading.paperMode) {
      return { allowed: true, reason: 'Paper trading mode' };
    }

    // 3. Market hours check (09:15 – 15:30 IST)
    if (!this._isMarketHours()) {
      return { allowed: false, reason: 'Outside market hours (09:15-15:30 IST)' };
    }

    // 4. Max daily loss check
    if (Math.abs(this.dailyLoss) >= config.trading.maxDailyLoss) {
      this._halt(`Max daily loss of ₹${config.trading.maxDailyLoss} reached`);
      return { allowed: false, reason: this.haltReason };
    }

    // 5. Max open positions check
    if (order.action === 'BUY' || order.action === 'SELL') {
      if (this.openPositionCount >= config.trading.maxOpenPositions) {
        return {
          allowed: false,
          reason: `Max open positions (${config.trading.maxOpenPositions}) reached`,
        };
      }
    }

    // 6. Expiry day special rules
    if (this._isExpiryDay()) {
      const istHour = this._getISTHour();
      // Block new short positions after 14:00 on expiry day
      if (istHour >= 14 && order.action === 'SELL') {
        return {
          allowed: false,
          reason: 'Expiry day rule: No new short positions after 14:00 IST',
        };
      }
    }

    return { allowed: true, reason: 'All checks passed' };
  }

  /**
   * Update P&L after a trade closes. Checks halt conditions.
   */
  updatePnl(tradePnl) {
    this.dailyLoss += Math.min(0, tradePnl);
    if (Math.abs(this.dailyLoss) >= config.trading.maxDailyLoss) {
      this._halt(`Daily loss limit ₹${config.trading.maxDailyLoss} breached`);
    }
  }

  _halt(reason) {
    this.tradingHalted = true;
    this.haltReason = reason;
    logger.error(`🛑 TRADING HALTED: ${reason}`);
    wsServer.alert('CRITICAL', `Trading halted: ${reason}`);
  }

  resumeTrading() {
    this.tradingHalted = false;
    this.haltReason = null;
    logger.info('Trading resumed');
    wsServer.alert('INFO', 'Trading resumed');
  }

  _isMarketHours() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const hhmm = ist.getUTCHours() * 100 + ist.getUTCMinutes();
    return hhmm >= 915 && hhmm <= 1530;
  }

  _isExpiryDay() {
    return new Date().getDay() === 4; // Thursday
  }

  _getISTHour() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    return ist.getUTCHours();
  }

  getStatus() {
    return {
      tradingHalted: this.tradingHalted,
      haltReason: this.haltReason,
      dailyLoss: this.dailyLoss,
      openPositionCount: this.openPositionCount,
      paperMode: config.trading.paperMode,
      maxDailyLoss: config.trading.maxDailyLoss,
      maxOpenPositions: config.trading.maxOpenPositions,
    };
  }
}

const riskManager = new RiskManager();
module.exports = { riskManager };
