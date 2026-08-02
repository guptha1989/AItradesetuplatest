const express = require('express');
const router = express.Router();
const axios = require('axios');
const { calcPivotLevels, calcFullSR } = require('../utils/srCalculator');
const { query } = require('../config/db');
const logger = require('../utils/logger');

// NSE headers needed to bypass anti-scraping
const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/',
  'Connection': 'keep-alive',
};

// Cookie cache — NSE requires a valid session cookie
let nseSession = { cookies: '', lastRefresh: 0 };

async function getNSESession() {
  const now = Date.now();
  // Refresh session every 10 minutes
  if (nseSession.cookies && (now - nseSession.lastRefresh) < 10 * 60 * 1000) {
    return nseSession.cookies;
  }
  try {
    const res = await axios.get('https://www.nseindia.com', {
      headers: NSE_HEADERS,
      timeout: 10000,
    });
    const raw = res.headers['set-cookie'] || [];
    nseSession.cookies = raw.map(c => c.split(';')[0]).join('; ');
    nseSession.lastRefresh = now;
    return nseSession.cookies;
  } catch (err) {
    logger.error('NSE session refresh failed:', err.message);
    return '';
  }
}

/**
 * Fetch most-active contracts from NSE.
 * URL: https://www.nseindia.com/market-data/most-active-contracts
 */
async function fetchNSEMostActive(symbol = 'NIFTY') {
  const cookies = await getNSESession();
  const url = `https://www.nseindia.com/api/live-analysis-most-active-contracts?index=${symbol.toLowerCase()}`;
  const res = await axios.get(url, {
    headers: { ...NSE_HEADERS, 'Cookie': cookies },
    timeout: 15000,
  });
  return res.data;
}

/**
 * Fetch option chain OHLC from NSE for S&R calculation.
 */
async function fetchNSEOptionChainOHLC(symbol = 'NIFTY') {
  const cookies = await getNSESession();
  const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`;
  const res = await axios.get(url, {
    headers: { ...NSE_HEADERS, 'Cookie': cookies },
    timeout: 15000,
  });
  return res.data;
}

const { calcTechfrostSR, getOpenPriceData, setOpenPriceData } = require('../utils/srCalculator');
const { replayEngine } = require('../utils/replayEngine');

const { getOptionChain } = require('../api/dhan/dhanClient');

// GET /api/sr — calculate S&R levels using Techfrost Nifty_V6_SR logic
router.get('/', async (req, res) => {
  try {
    const { mode = 'day_open', symbol = 'NIFTY', spot: reqSpot, strike: reqStrike, atm: reqAtm } = req.query;

    const calcBasis = mode === 'prev_close' ? 'Previous Day Settlement/Close' : 'Day Open Price';
    const selectedStrike = reqStrike ? parseInt(reqStrike) : null;
    const atmOverride = reqAtm ? parseInt(reqAtm) : null;

    let spot = parseFloat(reqSpot);
    let chain = [];

    // Check if historical data is active in replayEngine first
    if (replayEngine._historicalChain && replayEngine._historicalChain.length > 0) {
      chain = replayEngine._historicalChain;
      if (!spot) spot = replayEngine._historicalSpot || replayEngine.spotPrice;
    } else {
      // Fetch real live chain from Dhan API
      try {
        const dhanData = await getOptionChain(symbol);
        if (dhanData && dhanData.chain && dhanData.chain.length > 0) {
          if (!spot) spot = dhanData.spot;
          chain = dhanData.chain;
        }
      } catch (dhanErr) {
        logger.warn('Dhan fetch for S&R failed, trying replay/fallback:', dhanErr.message);
      }

      if (!chain || chain.length === 0) {
        chain = replayEngine.getCurrentChain();
        if (!spot) spot = replayEngine.spotPrice;
      }
    }

    if (!spot) spot = 24383.6;

    const result = calcTechfrostSR({
      spot,
      chain,
      calcBasis,
      strikeStep: 50,
      selectedStrike,
      atmOverride,  // manual ATM from frontend input
    });

    res.json({
      mode,
      symbol,
      atmOverride,
      ...result,
    });
  } catch (err) {
    logger.error('S&R calculation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sr/most-active — NSE most active contracts
router.get('/most-active', async (req, res) => {
  try {
    const { symbol = 'NIFTY' } = req.query;
    const data = await fetchNSEMostActive(symbol);
    res.json({ data });
  } catch (err) {
    logger.error('NSE most-active fetch error:', err.message);
    // Return mock data for development (when NSE blocks)
    res.status(503).json({
      error: 'NSE data unavailable',
      message: 'NSE API requires valid browser session. In production, use a scheduled fetch with session management.',
    });
  }
});

// GET /api/sr/option-chain-sr — full per-strike S&R from NSE chain
router.get('/option-chain-sr', async (req, res) => {
  try {
    const { symbol = 'NIFTY', mode = 'prev_close' } = req.query;
    const nseData = await fetchNSEOptionChainOHLC(symbol);
    const records = nseData?.records?.data || [];
    const underlying = nseData?.records?.underlyingValue || 0;

    // Build chain array with CE+PE matched by strike
    const strikeMap = {};
    records.forEach(r => {
      const strike = r.strikePrice;
      if (!strikeMap[strike]) strikeMap[strike] = {};
      if (r.CE) strikeMap[strike].ceClose = r.CE.lastPrice;
      if (r.PE) strikeMap[strike].peClose = r.PE.lastPrice;
      if (r.CE) strikeMap[strike].ceOI = r.CE.openInterest;
      if (r.PE) strikeMap[strike].peOI = r.PE.openInterest;
    });

    const chain = Object.entries(strikeMap).map(([strike, data]) => ({
      strike: parseInt(strike),
      ...data,
    })).sort((a, b) => a.strike - b.strike);

    // OHLC approximation from underlying
    const indexOHLC = { H: underlying * 1.002, L: underlying * 0.998, C: underlying, O: underlying };

    const result = calcFullSR(chain, indexOHLC, mode);
    res.json(result);
  } catch (err) {
    logger.error('Option chain S&R error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sr/day-open — fetch current locked 09:16 AM Day Open prices snapshot
router.get('/day-open', (req, res) => {
  res.json(getOpenPriceData());
});

// POST /api/sr/lock-open — manually capture & lock current 09:16 AM Day Open prices
router.post('/lock-open', async (req, res) => {
  try {
    const { symbol = 'NIFTY' } = req.body;
    let spot, chain;

    if (replayEngine._historicalChain && replayEngine._historicalChain.length > 0) {
      chain = replayEngine._historicalChain;
      spot = replayEngine._historicalSpot || replayEngine.spotPrice;
    } else {
      const dhanData = await getOptionChain(symbol);
      spot = dhanData.spot;
      chain = dhanData.chain;
    }

    setOpenPriceData(spot, chain, '09:16:00 AM', true);
    res.json({
      success: true,
      message: '09:16 AM Day Open prices locked successfully',
      data: getOpenPriceData(),
    });
  } catch (err) {
    logger.error('Lock open price failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
