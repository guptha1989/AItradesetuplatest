const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const {
  queryIndexCommodityCandles,
  queryHistoricalOptions,
  queryDailyEquities,
  getDbStats,
} = require('../db/sqliteDb');

/**
 * GET /api/historical/stats
 * Returns database summary, counts, date ranges, and file size
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getDbStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to get historical stats:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/historical/candles
 * Queries 1m & 3m candles for Indices & Commodities (Spot & Futures)
 */
router.get('/candles', (req, res) => {
  try {
    const {
      symbol = 'NIFTY',
      instrumentType = 'SPOT',
      timeframe = '1m',
      fromTs,
      toTs,
      limit = 1000,
    } = req.query;

    const candles = queryIndexCommodityCandles({
      symbol,
      instrumentType,
      timeframe,
      fromTs,
      toTs,
      limit,
    });

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      instrumentType: instrumentType.toUpperCase(),
      timeframe,
      total: candles.length,
      candles,
    });
  } catch (err) {
    logger.error('Failed to query historical candles:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/historical/options
 * Queries Options historical 1m & 3m candles across strikes & expiries
 */
router.get('/options', (req, res) => {
  try {
    const {
      underlying = 'NIFTY',
      strike,
      optionType,
      expiry,
      timeframe = '1m',
      fromTs,
      toTs,
      limit = 1000,
    } = req.query;

    const candles = queryHistoricalOptions({
      underlying,
      strike,
      optionType,
      expiry,
      timeframe,
      fromTs,
      toTs,
      limit,
    });

    res.json({
      success: true,
      underlying: underlying.toUpperCase(),
      strike: strike ? Number(strike) : null,
      optionType: optionType ? optionType.toUpperCase() : null,
      expiry,
      timeframe,
      total: candles.length,
      candles,
    });
  } catch (err) {
    logger.error('Failed to query historical options:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/historical/equities
 * Queries Equities Daily Historical Data (Daily Granularity Only, Cash & Stock Futures)
 */
router.get('/equities', (req, res) => {
  try {
    const {
      symbol = 'RELIANCE',
      instrumentType = 'CASH',
      fromDate,
      toDate,
      limit = 1000,
    } = req.query;

    const candles = queryDailyEquities({
      symbol,
      instrumentType,
      fromDate,
      toDate,
      limit,
    });

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      instrumentType: instrumentType.toUpperCase(),
      granularity: 'DAILY',
      total: candles.length,
      candles,
    });
  } catch (err) {
    logger.error('Failed to query historical equities:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

