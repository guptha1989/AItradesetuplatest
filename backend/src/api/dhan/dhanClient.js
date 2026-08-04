const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const BASE_URL = config.dhan.baseUrl;

const dhanHttp = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'access-token': config.dhan.accessToken,
    'client-id': config.dhan.clientId,
  },
});

// Response interceptor for unified error handling
dhanHttp.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message;
    logger.error(`Dhan API Error: ${msg}`, { url: err.config?.url, status: err.response?.status });
    throw new Error(`Dhan API: ${msg}`);
  }
);

// ─── Market Data ─────────────────────────────────────────────────────────────

let optionChainCache = { data: null, expiresAt: 0 };
let cachedExpiry = { date: '2026-08-04', expiresAt: 0 };

function getNextTuesdayExpiry() {
  const d = new Date();
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utcMs + (330 * 60000));
  const day = istDate.getDay();
  let diff = (2 - day + 7) % 7;
  const hh = istDate.getHours();
  const mm = istDate.getMinutes();
  if (day === 2 && (hh > 15 || (hh === 15 && mm >= 30))) {
    diff = 7;
  }
  istDate.setDate(istDate.getDate() + diff);
  return istDate.toISOString().split('T')[0];
}

async function getRealDhanExpiry(underlyingSymbol = 'NIFTY') {
  if (cachedExpiry.date && Date.now() < cachedExpiry.expiresAt) {
    return cachedExpiry.date;
  }
  const defaultTuesday = getNextTuesdayExpiry();
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const expRes = await dhanHttp.post('/optionchain/expirylist', {
      UnderlyingScrip: underlyingSymbol === 'BANKNIFTY' ? 25 : 13,
      UnderlyingSeg: 'IDX_I',
    });
    const list = expRes.data?.data || expRes.data || expRes;
    if (Array.isArray(list) && list.length > 0) {
      // Filter out past expired dates
      const activeList = list.filter(exp => exp >= todayStr);
      const chosen = activeList.length > 0 ? activeList[0] : defaultTuesday;
      cachedExpiry = { date: chosen, expiresAt: Date.now() + 600000 };
      return chosen;
    }
  } catch (e) {
    logger.warn(`Failed to fetch Dhan expiry list, using Tuesday fallback ${defaultTuesday}:`, e.message);
  }
  return defaultTuesday;
}

/**
 * Get full option chain for Nifty from Dhan API.
 * @param {string} underlyingSymbol - e.g., 'NIFTY'
 * @param {string} expiryDate - 'YYYY-MM-DD' (optional)
 */
async function getOptionChain(underlyingSymbol = 'NIFTY', expiryDate) {
  // If cache is fresh, return immediately (0ms delay)
  if (optionChainCache.data && Date.now() < optionChainCache.expiresAt) {
    return optionChainCache.data;
  }

  // Await refresh so callers get live Dhan HQ data
  await refreshOptionChainCacheBackground(underlyingSymbol, expiryDate);

  // Return fresh cache
  if (optionChainCache.data) {
    return optionChainCache.data;
  }

  const { replayEngine } = require('../../utils/replayEngine');
  const fallbackSpot = replayEngine.spotPrice || 24383.6;
  const fallbackAtm = Math.round(fallbackSpot / 50) * 50;

  return {
    spot: fallbackSpot,
    atm: fallbackAtm,
    expiry: expiryDate || '2026-08-04',
    chain: replayEngine.getCurrentChain(),
  };
}

async function refreshOptionChainCacheBackground(underlyingSymbol = 'NIFTY', expiryDate) {
  try {
    let targetExpiry = expiryDate;
    if (!targetExpiry) {
      targetExpiry = await getRealDhanExpiry(underlyingSymbol);
    }

    const res = await dhanHttp.post('/optionchain', {
      UnderlyingScrip: underlyingSymbol === 'BANKNIFTY' ? 25 : 13,
      UnderlyingSeg: 'IDX_I',
      Expiry: targetExpiry,
    });

    const chainData = res.data?.data || res.data || res;
    const spot = chainData.last_price || 24383.6;
    const ocMap = chainData.oc || {};

    const atm = Math.round(spot / 50) * 50;
    const strikes = Object.keys(ocMap).map(Number).sort((a, b) => a - b);

    const chainArray = strikes.map(strike => {
      const rowKey = strike.toFixed(6);
      const row = ocMap[rowKey] || ocMap[strike] || {};

      const ce = row.ce || {};
      const pe = row.pe || {};

      const ceLTP = ce.last_price || 0;
      const peLTP = pe.last_price || 0;
      const ceOI = ce.oi || 0;
      const peOI = pe.oi || 0;

      const ceOIChange = ce.previous_oi ? (ce.oi - ce.previous_oi) : 0;
      const peOIChange = pe.previous_oi ? (pe.oi - pe.previous_oi) : 0;

      const ceOIChangePct = ce.previous_oi > 0 ? ((ceOIChange / ce.previous_oi) * 100) : 0;
      const peOIChangePct = pe.previous_oi > 0 ? ((peOIChange / pe.previous_oi) * 100) : 0;

      const cePriceChg = ceLTP - (ce.previous_close_price || ceLTP);
      const pePriceChg = peLTP - (pe.previous_close_price || peLTP);

      const ceBuildup = ceOIChange > 0 ? (cePriceChg >= 0 ? 'LONG BUILD-UP' : 'SHORT BUILD-UP') : (cePriceChg >= 0 ? 'SHORT COVERING' : 'LONG UNWINDING');
      const peBuildup = peOIChange > 0 ? (pePriceChg >= 0 ? 'LONG BUILD-UP' : 'SHORT BUILD-UP') : (pePriceChg >= 0 ? 'SHORT COVERING' : 'LONG UNWINDING');

      return {
        strike,
        isATM: strike === atm,
        ceOpen: ce.open_price || ce.open || ce.ohlc?.open || ce.average_price || ce.previous_close_price || ceLTP,
        cePrev: ce.previous_close_price || ceLTP,
        ceLTP,
        ceOI,
        ceOIChange,
        ceOIChangePct: parseFloat(ceOIChangePct.toFixed(1)),
        ceVolume: ce.volume || 0,
        ceIV: ce.implied_volatility ? parseFloat(ce.implied_volatility.toFixed(1)) : 0,
        ceDelta: ce.greeks?.delta ? parseFloat(ce.greeks.delta.toFixed(3)) : 0,
        ceGamma: ce.greeks?.gamma ? parseFloat(ce.greeks.gamma.toFixed(5)) : 0,
        ceTheta: ce.greeks?.theta ? parseFloat(ce.greeks.theta.toFixed(2)) : 0,
        peOpen: pe.open_price || pe.open || pe.ohlc?.open || pe.average_price || pe.previous_close_price || peLTP,
        pePrev: pe.previous_close_price || peLTP,
        peLTP,
        peOI,
        peOIChange,
        peOIChangePct: parseFloat(peOIChangePct.toFixed(1)),
        peVolume: pe.volume || 0,
        peIV: pe.implied_volatility ? parseFloat(pe.implied_volatility.toFixed(1)) : 0,
        peDelta: pe.greeks?.delta ? parseFloat(pe.greeks.delta.toFixed(3)) : 0,
        peGamma: pe.greeks?.gamma ? parseFloat(pe.greeks.gamma.toFixed(5)) : 0,
        peTheta: pe.greeks?.theta ? parseFloat(pe.greeks.theta.toFixed(2)) : 0,
        bep: parseFloat(((ceLTP + peLTP) / 2).toFixed(2)),
        buildup: { ce: ceBuildup, pe: peBuildup },
        ceSecurityId: ce.security_id || null,
        peSecurityId: pe.security_id || null,
      };
    });

    const result = {
      spot,
      atm,
      expiry: targetExpiry,
      chain: chainArray,
    };

    optionChainCache = { data: result, expiresAt: Date.now() + 10000 };
  } catch (err) {
    logger.warn('getOptionChain API rate limited or unavailable, retaining live cache:', err.message);
    if (optionChainCache.data) {
      optionChainCache.expiresAt = Date.now() + 6000;
    }
  }
}

// ─── Account Data ────────────────────────────────────────────────────────────

async function getQuotes(securities) {
  try {
    const res = await dhanHttp.post('/marketfeed/quote', { securities });
    return res.data || res;
  } catch (err) {
    logger.error('Failed to fetch quote:', err.message);
    return null;
  }
}

async function getLTP(securityId, exchangeSegment = 'NSE_EQ') {
  const quotes = await getQuotes([{ exchangeSegment, securityId }]);
  return quotes?.[securityId]?.last_price || null;
}

async function getHistoricalCandles(securityId, exchangeSegment, interval = '1') {
  try {
    const res = await dhanHttp.post('/charts/intraday', {
      securityId,
      exchangeSegment,
      instrumentType: 'INDEX',
      interval,
    });
    return res.data || res;
  } catch (err) {
    logger.error('Failed to fetch historical candles:', err.message);
    return [];
  }
}

// ─── Order Placement ──────────────────────────────────────────────────────────

async function placeOrder(params) {
  try {
    const payload = {
      dhanClientId: config.dhan.clientId,
      transactionType: params.transactionType,
      exchangeSegment: params.exchangeSegment || 'NSE_FNO',
      productType: params.productType || 'INTRADAY',
      orderType: params.orderType || 'MARKET',
      validity: 'DAY',
      tradingSymbol: params.tradingSymbol,
      securityId: params.securityId,
      quantity: params.quantity,
      price: params.price || 0,
      triggerPrice: params.triggerPrice || 0,
      afterMarketOrder: false,
    };

    const res = await dhanHttp.post('/orders', payload);
    logger.info(`Order placed successfully [${res.orderId}]: ${params.tradingSymbol}`);
    return res;
  } catch (err) {
    logger.error('Order placement failed:', err.message);
    throw err;
  }
}

async function cancelOrder(orderId) {
  return await dhanHttp.delete(`/orders/${orderId}`);
}

async function modifyOrder(orderId, params) {
  return await dhanHttp.put(`/orders/${orderId}`, params);
}

async function getOrders() {
  return await dhanHttp.get('/orders');
}

async function getPositions() {
  return await dhanHttp.get('/positions');
}

async function getHoldings() {
  return await dhanHttp.get('/holdings');
}

async function getFundLimits() {
  return await dhanHttp.get('/fundlimit');
}

async function getOrderById(orderId) {
  return await dhanHttp.get(`/orders/${orderId}`);
}

async function getTrades() {
  return await dhanHttp.get('/trades');
}

function getNextWeeklyExpiry() {
  return cachedExpiry.date || '2026-08-04';
}

function tradingDaysToExpiry(expiryDateStr) {
  const today = new Date();
  const expiry = new Date(expiryDateStr);
  let days = 0;
  const cursor = new Date(today);
  while (cursor <= expiry) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(days, 0);
}

module.exports = {
  getOptionChain,
  getQuotes,
  getLTP,
  getHistoricalCandles,
  placeOrder,
  cancelOrder,
  modifyOrder,
  getOrders,
  getPositions,
  getHoldings,
  getFundLimits,
  getOrderById,
  getTrades,
  getNextWeeklyExpiry,
  getRealDhanExpiry,
  getNextTuesdayExpiry,
  tradingDaysToExpiry,
};
