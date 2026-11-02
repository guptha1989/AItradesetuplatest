const express = require('express');
const router = express.Router();
const { getOptionChain, getLTP, getNextWeeklyExpiry, tradingDaysToExpiry, getRealDhanExpiry } = require('../api/dhan/dhanClient');
const { getThursdayExpiries, getNextThursdayExpiry } = require('../utils/expiryHelper');
const { calcGreeks, calcPCR, findATMStrike } = require('../utils/greeksCalc');
const { tickBuffer } = require('../utils/tickBuffer');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const { formatIstDateTime } = require('../utils/dateHelper');

const { replayEngine } = require('../utils/replayEngine');
const { liveEngine } = require('../api/dhan/liveEngine');

let chainCache = { key: null, data: null, expiresAt: 0 };

// GET /api/chain/expiries — dynamic weekly & monthly Thursday expiries with Dhan API sync
router.get('/expiries', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'NIFTY';
    const standardExpiries = getThursdayExpiries();
    let dhanExpiry = null;
    try {
      dhanExpiry = await getRealDhanExpiry(symbol);
    } catch (_) {}

    res.json({
      success: true,
      symbol,
      expiries: standardExpiries,
      currentWeek: standardExpiries[0],
      nextWeek: standardExpiries[1],
      currentMonth: standardExpiries[2],
      nextMonth: standardExpiries[3],
      dhanExpiry,
      dhanTime: liveEngine?.latestData?.updatedAt || formatIstDateTime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Failed to get expiries:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/chain — fetch full option chain for nearest expiry
router.get('/', async (req, res) => {
  try {
    const expiry = req.query.expiry || '';
    const symbol = req.query.symbol || 'NIFTY';

    // Prefer liveEngine if live & updated for NIFTY
    const liveData = liveEngine.getLatestData();
    if (symbol.toUpperCase() === 'NIFTY' && liveEngine.isLive && liveData.chain && liveData.chain.length > 0) {
      return res.json({ ...liveData, dhanTime: liveData.updatedAt || formatIstDateTime() });
    }
    const cacheKey = `${symbol}_${expiry}`;

    if (chainCache.key === cacheKey && chainCache.data && Date.now() < chainCache.expiresAt) {
      return res.json(chainCache.data);
    }

    let result = null;

    try {
      result = await getOptionChain(symbol, expiry);
    } catch (dhanErr) {
      logger.warn('Dhan option chain fetch warning:', dhanErr.message);
    }

    if (!result || !result.chain || result.chain.length === 0) {
      const fallbackChain = replayEngine.getCurrentChain();
      result = {
        spot: replayEngine.spotPrice,
        atm: Math.round(replayEngine.spotPrice / 50) * 50,
        expiry: expiry || getNextWeeklyExpiry(),
        chain: fallbackChain,
      };
    }

    chainCache = {
      key: cacheKey,
      data: result,
      expiresAt: Date.now() + 3000,
    };

    res.json(result);
  } catch (err) {
    logger.error('Option chain fetch failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chain/snapshot — get latest snapshot from DB
router.get('/snapshot', async (req, res) => {
  try {
    const [snapshot] = await query(
      `SELECT * FROM option_chain_snapshots ORDER BY snapshot_at DESC LIMIT 1`
    );
    if (!snapshot) return res.json({ snapshot: null, message: 'No snapshot available yet' });
    if (snapshot.chain_json) snapshot.chain = JSON.parse(snapshot.chain_json);
    delete snapshot.chain_json;
    res.json({ snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chain/greeks?spot=&strike=&tte=&iv=&type=
router.get('/greeks', (req, res) => {
  const { spot, strike, tte, iv, type } = req.query;
  if (!spot || !strike || !tte || !iv || !type) {
    return res.status(400).json({ error: 'spot, strike, tte, iv, type are required' });
  }
  const greeks = calcGreeks({
    spot: parseFloat(spot),
    strike: parseInt(strike),
    tte: parseInt(tte),
    iv: parseFloat(iv),
    type: type.toUpperCase(),
  });
  res.json({ greeks });
});

// GET /api/chain/buffer — get latest ticks from in-memory buffer
router.get('/buffer', (req, res) => {
  const key = req.query.key;
  if (key) {
    const ticks = tickBuffer.getLast(key, 20);
    return res.json({ key, ticks });
  }
  res.json({ stats: tickBuffer.stats() });
});

module.exports = router;
