const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { getContractExpiries, getDefaultExpiry, getThursdayExpiries, getNextThursdayExpiry, fmt } = require('../../utils/expiryHelper');

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

// ─── Instrument to Dhan Security ID Mapping ──────────────────────────────────
const SCRIP_MAP = {
  // Indices
  'NIFTY': { scrip: 13, seg: 'IDX_I', step: 50, exchange: 'NSE', spot: 23053.10, lotSize: 25 },
  'BANKNIFTY': { scrip: 25, seg: 'IDX_I', step: 100, exchange: 'NSE', spot: 54686.95, lotSize: 15 },
  'FINNIFTY': { scrip: 27, seg: 'IDX_I', step: 50, exchange: 'NSE', spot: 24712.20, lotSize: 25 },
  'MIDCPNIFTY': { scrip: 443, seg: 'IDX_I', step: 25, exchange: 'NSE', spot: 12360.40, lotSize: 50 },
  'SENSEX': { scrip: 51, seg: 'IDX_I', step: 100, exchange: 'BSE', spot: 74459.53, lotSize: 10 },
  'BANKEX': { scrip: 52, seg: 'IDX_I', step: 100, exchange: 'BSE', spot: 58400.00, lotSize: 15 },

  // NSE Equities
  'RELIANCE': { scrip: 2885, seg: 'NSE_EQ', step: 20, exchange: 'NSE', spot: 1164.90, lotSize: 250 },
  'TCS': { scrip: 11536, seg: 'NSE_EQ', step: 50, exchange: 'NSE', spot: 2502.60, lotSize: 175 },
  'HDFCBANK': { scrip: 1333, seg: 'NSE_EQ', step: 10, exchange: 'NSE', spot: 692.80, lotSize: 550 },
  'INFY': { scrip: 1594, seg: 'NSE_EQ', step: 20, exchange: 'NSE', spot: 1185.00, lotSize: 400 },
  'ICICIBANK': { scrip: 4963, seg: 'NSE_EQ', step: 10, exchange: 'NSE', spot: 1398.00, lotSize: 700 },
  'TATAMOTORS': { scrip: 3456, seg: 'NSE_EQ', step: 5, exchange: 'NSE', spot: 265.40, lotSize: 700 },
  'SBIN': { scrip: 3045, seg: 'NSE_EQ', step: 10, exchange: 'NSE', spot: 961.85, lotSize: 750 },
  'BHARTIARTL': { scrip: 10604, seg: 'NSE_EQ', step: 20, exchange: 'NSE', spot: 1973.70, lotSize: 475 },
  'BAJFINANCE': { scrip: 317, seg: 'NSE_EQ', step: 50, exchange: 'NSE', spot: 7100.00, lotSize: 125 },
  'TRENT': { scrip: 1964, seg: 'NSE_EQ', step: 50, exchange: 'NSE', spot: 7400.00, lotSize: 100 },

  // MCX Commodities
  'CRUDEOIL': { scrip: null, seg: 'MCX_COMM', step: 50, exchange: 'MCX', spot: 5840.00, lotSize: 100 },
  'GOLD': { scrip: null, seg: 'MCX_COMM', step: 100, exchange: 'MCX', spot: 78450.00, lotSize: 10 },
  'SILVER': { scrip: null, seg: 'MCX_COMM', step: 500, exchange: 'MCX', spot: 95200.00, lotSize: 30 },
  'NATURALGAS': { scrip: null, seg: 'MCX_COMM', step: 5, exchange: 'MCX', spot: 234.50, lotSize: 1250 },
  'COPPER': { scrip: null, seg: 'MCX_COMM', step: 5, exchange: 'MCX', spot: 828.40, lotSize: 2500 },

  // BSE Smallcaps
  'TTML': { scrip: null, seg: 'BSE_EQ', step: 2.5, exchange: 'BSE', spot: 75.20, lotSize: 1000 },
  'BCG': { scrip: null, seg: 'BSE_EQ', step: 0.5, exchange: 'BSE', spot: 12.40, lotSize: 2000 },
  'SUZLON': { scrip: null, seg: 'BSE_EQ', step: 2.5, exchange: 'BSE', spot: 65.00, lotSize: 1000 },
};

// Multi-symbol option chain and expiry caches
const optionChainCache = new Map(); // Key: `${symbol}_${expiry}` -> { data, expiresAt }
const cachedExpiries = new Map();   // Key: symbol -> { list, date, expiresAt }

/**
 * Fetches dynamic, real-time Dhan contract expiries for any symbol.
 * Automatically aligns with SEBI schedule and exchange holiday shifts.
 */
async function getRealDhanExpiryList(underlyingSymbol = 'NIFTY') {
  const sym = (underlyingSymbol || 'NIFTY').toUpperCase();
  const cached = cachedExpiries.get(sym);
  if (cached && Date.now() < cached.expiresAt && Array.isArray(cached.list) && cached.list.length > 0) {
    return cached.list;
  }

  const fallbackList = getContractExpiries(sym);
  const scripMeta = SCRIP_MAP[sym];

  if (!scripMeta || !scripMeta.scrip) {
    return fallbackList;
  }

  try {
    const expRes = await dhanHttp.post('/optionchain/expirylist', {
      UnderlyingScrip: scripMeta.scrip,
      UnderlyingSeg: scripMeta.seg,
    });
    const list = expRes.data?.data || expRes.data || expRes;
    if (Array.isArray(list) && list.length > 0) {
      // Calculate IST today date
      const now = new Date();
      const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istDate = new Date(utcMs + (330 * 60000));
      const todayStr = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;

      const activeDates = list.filter(exp => exp >= todayStr);
      const datesToFormat = activeDates.length > 0 ? activeDates : list;

      const isWeekly = ['NIFTY', 'SENSEX'].includes(sym);
      const formattedList = datesToFormat.slice(0, 6).map((isoStr, idx) => {
        const [y, m, d] = isoStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const formattedMeta = fmt(dt);
        let type = 'EXPIRY';
        let labelSuffix = '';
        if (isWeekly) {
          if (idx === 0) { type = 'CURRENT_WEEK'; labelSuffix = ' (Current Week)'; }
          else if (idx === 1) { type = 'NEXT_WEEK'; labelSuffix = ' (Next Week)'; }
          else if (idx === 2) { type = 'CURRENT_MONTH'; labelSuffix = ' (Current Month)'; }
          else if (idx === 3) { type = 'NEXT_MONTH'; labelSuffix = ' (Next Month)'; }
          else { type = 'FAR_MONTH'; labelSuffix = ` (Contract ${idx + 1})`; }
        } else {
          if (idx === 0) { type = 'CURRENT_MONTH'; labelSuffix = ' (Current Month)'; }
          else if (idx === 1) { type = 'NEXT_MONTH'; labelSuffix = ' (Next Month)'; }
          else if (idx === 2) { type = 'FAR_MONTH'; labelSuffix = ' (Far Month)'; }
          else { type = 'FAR_MONTH'; labelSuffix = ` (Contract ${idx + 1})`; }
        }

        return {
          id: isoStr,
          date: isoStr,
          formatted: formattedMeta.formatted,
          label: `${formattedMeta.labelDate}${labelSuffix}`,
          type,
        };
      });

      cachedExpiries.set(sym, {
        list: formattedList,
        date: formattedList[0].date,
        expiresAt: Date.now() + 600000,
      });
      return formattedList;
    }
  } catch (e) {
    logger.warn(`Failed to fetch Dhan expiry list for ${sym}, fallback to SEBI rules: ${e.message}`);
  }

  return fallbackList;
}

async function getRealDhanExpiry(underlyingSymbol = 'NIFTY') {
  const sym = (underlyingSymbol || 'NIFTY').toUpperCase();
  const list = await getRealDhanExpiryList(sym);
  return list[0]?.date || getDefaultExpiry(sym);
}

/**
 * Get full option chain for any instrument from Dhan API.
 * @param {string} underlyingSymbol - e.g., 'NIFTY', 'BANKNIFTY', 'SENSEX', 'RELIANCE'
 * @param {string} expiryDate - 'YYYY-MM-DD' (optional)
 */
async function getOptionChain(underlyingSymbol = 'NIFTY', expiryDate) {
  const sym = (underlyingSymbol || 'NIFTY').toUpperCase();
  const cacheKey = `${sym}_${expiryDate || 'default'}`;

  // If cache is fresh for this exact symbol, return immediately
  const cached = optionChainCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // Refresh cache from Dhan
  await refreshOptionChainCacheBackground(sym, expiryDate);

  const fresh = optionChainCache.get(cacheKey);
  if (fresh) {
    return fresh.data;
  }

  // Fallback if network fails
  const scripMeta = SCRIP_MAP[sym] || SCRIP_MAP.NIFTY;
  const fallbackSpot = scripMeta.spot || 23053.10;
  const fallbackAtm = Math.round(fallbackSpot / scripMeta.step) * scripMeta.step;

  return {
    symbol: sym,
    spot: fallbackSpot,
    atm: fallbackAtm,
    expiry: expiryDate || getNextThursdayExpiry(),
    chain: [],
  };
}

async function refreshOptionChainCacheBackground(underlyingSymbol = 'NIFTY', expiryDate) {
  const sym = (underlyingSymbol || 'NIFTY').toUpperCase();
  const scripMeta = SCRIP_MAP[sym];
  const targetExpiry = expiryDate || getNextThursdayExpiry();
  const cacheKey = `${sym}_${targetExpiry}`;

  if (!scripMeta || !scripMeta.scrip) {
    // Non-F&O or MCX commodity fallback
    const fallbackSpot = scripMeta?.spot || 23053.10;
    const fallbackStep = scripMeta?.step || 50;
    optionChainCache.set(cacheKey, {
      data: {
        symbol: sym,
        spot: fallbackSpot,
        atm: Math.round(fallbackSpot / fallbackStep) * fallbackStep,
        expiry: targetExpiry,
        chain: [],
      },
      expiresAt: Date.now() + 60000,
    });
    return;
  }

  try {
    let targetExpiry = expiryDate;
    if (!targetExpiry) {
      targetExpiry = await getRealDhanExpiry(sym);
    }

    const res = await dhanHttp.post('/optionchain', {
      UnderlyingScrip: scripMeta.scrip,
      UnderlyingSeg: scripMeta.seg,
      Expiry: targetExpiry,
    });

    const chainData = res.data?.data || res.data || res;
    const spot = Number(chainData.last_price || scripMeta.spot);
    const ocMap = chainData.oc || {};

    const atm = Math.round(spot / scripMeta.step) * scripMeta.step;
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
      symbol: sym,
      spot,
      atm,
      step: scripMeta.step,
      expiry: targetExpiry,
      chain: chainArray,
    };

    optionChainCache.set(cacheKey, { data: result, expiresAt: Date.now() + 15000 });
  } catch (err) {
    logger.warn(`getOptionChain API error for ${sym}, retaining fallback: ${err.message}`);
    const fallbackSpot = scripMeta.spot;
    const fallbackStep = scripMeta.step;
    optionChainCache.set(cacheKey, {
      data: {
        symbol: sym,
        spot: fallbackSpot,
        atm: Math.round(fallbackSpot / fallbackStep) * fallbackStep,
        expiry: expiryDate || getNextThursdayExpiry(),
        chain: [],
      },
      expiresAt: Date.now() + 10000,
    });
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
  return getNextThursdayExpiry();
}

/**
 * Weekly Thursday Rollover Pipeline
 * Pulls updated contract data from Dhan API for all required instruments
 */
async function refreshContractDataForRequiredInstruments() {
  const currentExpiry = getNextThursdayExpiry();
  logger.info(`[Thursday Rollover Pipeline] Pulling updated contract data for all required instruments. Target Expiry: ${currentExpiry}`);
  const instruments = Object.keys(SCRIP_MAP);
  const results = {};
  for (const sym of instruments) {
    try {
      const chain = await getOptionChain(sym, currentExpiry);
      results[sym] = {
        success: true,
        spot: chain.spot,
        atm: chain.atm,
        expiry: chain.expiry,
        strikes: chain.chain?.length || 0,
      };
      logger.info(`[Thursday Rollover Pipeline] Contract data updated for ${sym} (Spot: ${chain.spot}, ATM: ${chain.atm}, Expiry: ${chain.expiry})`);
    } catch (e) {
      logger.warn(`[Thursday Rollover Pipeline] Failed to update contract data for ${sym}: ${e.message}`);
    }
  }
  return { expiry: currentExpiry, instruments: results, timestamp: new Date().toISOString() };
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
  SCRIP_MAP,
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
  getNextThursdayExpiry,
  getThursdayExpiries,
  getRealDhanExpiry,
  getRealDhanExpiryList,
  refreshContractDataForRequiredInstruments,
  tradingDaysToExpiry,
};
