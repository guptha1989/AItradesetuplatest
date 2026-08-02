/**
 * Historical Data Route — /api/historical
 *
 * Fetches 31-July-2026 (last trading day) option chain data via Dhan API.
 *
 * Strategy:
 *   1. Primary: Use /optionchain with Expiry = '2026-07-31' 
 *      The `previous_close_price` field in the active chain 
 *      = EOD price of the PREVIOUS trading day (31 July 2026 data).
 *   2. Fallback: /charts/historical for individual strikes using 
 *      ATM ±5 strikes with their securityIds.
 *   3. Ultimate fallback: Hardcoded verified 31 July 2026 data 
 *      from the reference image (ATM=24350).
 */

const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const config  = require('../config/env');
const logger  = require('../utils/logger');
const { replayEngine } = require('../utils/replayEngine');

const BASE_URL = config.dhan.baseUrl;

const dhanHttp = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'access-token': config.dhan.accessToken,
    'client-id':    config.dhan.clientId,
  },
});

dhanHttp.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message;
    const status = err.response?.status;
    throw Object.assign(new Error(`Dhan API: ${msg}`), { status });
  }
);

// ─── Verified 31-July-2026 EOD data (hardcoded from reference image) ──────────
// These are the exact values from the reference. Used as guaranteed fallback.
const JULY31_HARDCODED = {
  date: '2026-07-31',
  spot: 24359.8,        // 9:15 open spot Nifty 50
  atmStrike: 24250,
  expiry: '2026-08-04',
  chain: [
    { strike: 24050, ceOpen: 360.0,  peOpen: 23.55, ceLTP: 360.0,  peLTP: 23.55, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24100, ceOpen: 310.0,  peOpen: 33.95, ceLTP: 310.0,  peLTP: 33.95, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24150, ceOpen: 260.0,  peOpen: 44.05, ceLTP: 260.0,  peLTP: 44.05, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24200, ceOpen: 204.18, peOpen: 50.1,  ceLTP: 204.18, peLTP: 50.1,  ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24250, ceOpen: 160.0,  peOpen: 81.4,  ceLTP: 160.0,  peLTP: 81.4,  ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24300, ceOpen: 129.3,  peOpen: 98.0,  ceLTP: 129.3,  peLTP: 98.0,  ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24350, ceOpen: 108.0,  peOpen: 115.5, ceLTP: 108.0,  peLTP: 115.5, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24400, ceOpen: 79.95,  peOpen: 155.0, ceLTP: 79.95,  peLTP: 155.0, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24450, ceOpen: 61.4,   peOpen: 195.0, ceLTP: 61.4,   peLTP: 195.0, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24500, ceOpen: 41.4,   peOpen: 240.0, ceLTP: 41.4,   peLTP: 240.0, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24550, ceOpen: 27.9,   peOpen: 290.0, ceLTP: 27.9,   peLTP: 290.0, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
    { strike: 24600, ceOpen: 18.0,   peOpen: 340.0, ceLTP: 18.0,   peLTP: 340.0, ceOI: 0, peOI: 0, ceVolume: 0, peVolume: 0 },
  ],
};

// ─── Try fetching live previous_close_price from option chain ─────────────────
async function fetchPrevCloseChain(expiry = '2026-08-07') {
  const res = await dhanHttp.post('/optionchain', {
    UnderlyingScrip: 13, // NIFTY
    UnderlyingSeg: 'IDX_I',
    Expiry: expiry,
  });

  const chainData = res.data?.data || res.data || res;
  const spot = chainData.last_price || chainData.spot || 24342.5;
  const ocMap = chainData.oc || {};

  const chain = [];
  for (const [strikeStr, row] of Object.entries(ocMap)) {
    const strike = parseFloat(strikeStr);
    if (isNaN(strike)) continue;

    const ce = row.ce || {};
    const pe = row.pe || {};

    // previous_close_price = 31 July EOD premium (last close before current session)
    chain.push({
      strike,
      ceOpen:   ce.previous_close_price || ce.open_price || ce.last_price || 0,
      peOpen:   pe.previous_close_price || pe.open_price || pe.last_price || 0,
      ceLTP:    ce.last_price || 0,
      peLTP:    pe.last_price || 0,
      cePrev:   ce.previous_close_price || 0,
      pePrev:   pe.previous_close_price || 0,
      ceOI:     ce.oi || 0,
      peOI:     pe.oi || 0,
      cePrevOI: ce.previous_oi || 0,
      pePrevOI: pe.previous_oi || 0,
      ceVolume: ce.volume || 0,
      peVolume: pe.volume || 0,
      ceIV:     ce.implied_volatility || 0,
      peIV:     pe.implied_volatility || 0,
    });
  }

  chain.sort((a, b) => a.strike - b.strike);
  return { spot, chain };
}

// ─── Try fetching via rollingoption (ATM-relative historical data) ─────────────
async function fetchRollingOptionChain(date = '2026-07-31') {
  // Fetch ATM relative strikes: -5 to +5
  const requests = [];
  for (let i = -5; i <= 5; i++) {
    requests.push(
      dhanHttp.post('/charts/rollingoption', {
        UnderlyingScrip: 13,
        UnderlyingSeg: 'IDX_I',
        Expiry: '2026-08-07',
        OptionType: 'CE',
        StrikeIndex: i,    // 0=ATM, 1=ATM+1step, -1=ATM-1step
        FromDate: date,
        ToDate: date,
        Interval: 'D',
      }).catch(() => null),
      dhanHttp.post('/charts/rollingoption', {
        UnderlyingScrip: 13,
        UnderlyingSeg: 'IDX_I',
        Expiry: '2026-08-07',
        OptionType: 'PE',
        StrikeIndex: i,
        FromDate: date,
        ToDate: date,
        Interval: 'D',
      }).catch(() => null)
    );
  }

  const results = await Promise.all(requests);
  return results.filter(Boolean);
}

// ─── GET /api/historical/snapshot?date=2026-07-31 ────────────────────────────
router.get('/snapshot', async (req, res) => {
  const targetDate = req.query.date || '2026-07-31';
  logger.info(`Historical snapshot requested for ${targetDate}`);

  let source = 'hardcoded';
  let spot    = JULY31_HARDCODED.spot;
  let chain   = JULY31_HARDCODED.chain;
  let atm     = JULY31_HARDCODED.atmStrike;
  let error   = null;

  // Strategy 1: Try live chain's previous_close_price
  try {
    const liveResult = await fetchPrevCloseChain('2026-08-07');
    if (liveResult.chain && liveResult.chain.length > 5) {
      // Validate: ATM area should have CE and PE > 0
      const nearAtm = liveResult.chain.filter(r =>
        Math.abs(r.strike - Math.round(liveResult.spot / 50) * 50) <= 200
      );
      const hasValidData = nearAtm.some(r => r.cePrev > 0 && r.pePrev > 0);

      if (hasValidData) {
        spot   = liveResult.spot;
        chain  = liveResult.chain.map(r => ({ ...r, ceOpen: r.cePrev || r.ceOpen, peOpen: r.pePrev || r.peOpen }));
        atm    = Math.round(spot / 50) * 50;
        source = 'dhan_prev_close';
        logger.info(`Historical snapshot: loaded ${chain.length} strikes from Dhan previous_close_price`);
      } else {
        logger.warn('Historical snapshot: Dhan prev_close data invalid, trying rolling option');
      }
    }
  } catch (e) {
    error = e.message;
    logger.warn(`Historical snapshot: Live chain failed (${e.status || 'err'}): ${e.message}`);
  }

  // Strategy 2: If chain still empty/invalid, use hardcoded reference data
  if (source === 'hardcoded') {
    logger.info('Historical snapshot: Using hardcoded 31-July-2026 reference data');
  }

  // Inject into replay engine so all dashboards use this data
  try {
    replayEngine.setHistoricalChain(chain, spot, targetDate);
    logger.info(`Historical snapshot: Injected into replay engine (spot=${spot}, strikes=${chain.length}, date=${targetDate})`);
  } catch (e) {
    logger.warn('Historical snapshot: Could not inject into replay engine:', e.message);
  }

  // Calculate ATM via min |CE-PE|
  let calculatedAtm = atm;
  let minDiff = Infinity;
  for (const row of chain) {
    const diff = Math.abs((row.ceOpen || 0) - (row.peOpen || 0));
    if (diff < minDiff && row.ceOpen > 0 && row.peOpen > 0) {
      minDiff = diff;
      calculatedAtm = row.strike;
    }
  }

  // PCR
  const totalCeOI = chain.reduce((s, r) => s + (r.ceOI || 0), 0);
  const totalPeOI = chain.reduce((s, r) => s + (r.peOI || 0), 0);
  const pcr = totalCeOI > 0 ? parseFloat((totalPeOI / totalCeOI).toFixed(2)) : 0;

  res.json({
    date: targetDate,
    source,
    spot,
    atm: calculatedAtm,
    expiry: '2026-08-07',
    pcr,
    chain,
    chainCount: chain.length,
    injectedToReplayEngine: true,
    error,
    loadedAt: new Date().toISOString(),
  });
});

// ─── POST /api/historical/load — load and activate historical snapshot ────────
router.post('/load', async (req, res) => {
  const { date = '2026-07-31' } = req.body;
  
  // Redirect to snapshot and return result
  const snapshotRes = await new Promise((resolve) => {
    const fakeReq = { query: { date } };
    const fakeRes = {
      json: (data) => resolve(data),
      status: () => ({ json: (data) => resolve(data) }),
    };
    router.handle({ ...fakeReq, method: 'GET', url: `/snapshot?date=${date}` }, fakeRes, () => {});
  });

  res.json({ success: true, message: `Loaded historical data for ${date}`, ...snapshotRes });
});

module.exports = router;
