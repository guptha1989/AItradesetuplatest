const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { liveEngine } = require('../api/dhan/liveEngine');
const { formatIstDateTime } = require('../utils/dateHelper');

// Master spot & volatility prices for Friday 30 Oct session across MCX, NSE, BSE
const BASE_PRICES = {
  // NSE Indices
  'NIFTY': { name: 'NIFTY 50', spot: 23053.10, step: 50, vol: 0.008, exchange: 'NSE' },
  'BANKNIFTY': { name: 'BANK NIFTY', spot: 51820.40, step: 100, vol: 0.012, exchange: 'NSE' },
  'FINNIFTY': { name: 'FIN NIFTY', spot: 23612.30, step: 50, vol: 0.009, exchange: 'NSE' },
  'MIDCPNIFTY': { name: 'MIDCAP NIFTY', spot: 12850.00, step: 25, vol: 0.010, exchange: 'NSE' },
  
  // BSE Indices
  'SENSEX': { name: 'BSE SENSEX', spot: 79724.12, step: 100, vol: 0.008, exchange: 'BSE' },
  'BANKEX': { name: 'BSE BANKEX', spot: 58400.00, step: 100, vol: 0.011, exchange: 'BSE' },
  
  // MCX Commodities
  'CRUDEOIL': { name: 'CRUDE OIL', spot: 5840.00, step: 50, vol: 0.015, exchange: 'MCX' },
  'GOLD': { name: 'GOLD', spot: 78450.00, step: 100, vol: 0.007, exchange: 'MCX' },
  'SILVER': { name: 'SILVER', spot: 95200.00, step: 500, vol: 0.014, exchange: 'MCX' },
  'NATURALGAS': { name: 'NATURAL GAS', spot: 234.50, step: 5, vol: 0.022, exchange: 'MCX' },
  'COPPER': { name: 'COPPER', spot: 828.40, step: 5, vol: 0.012, exchange: 'MCX' },
  
  // NSE & BSE Equities
  'RELIANCE': { name: 'Reliance Industries Ltd.', spot: 2980.00, step: 20, vol: 0.011, exchange: 'NSE' },
  'TCS': { name: 'Tata Consultancy Services Ltd.', spot: 4120.00, step: 50, vol: 0.009, exchange: 'NSE' },
  'INFY': { name: 'Infosys Ltd.', spot: 1820.00, step: 20, vol: 0.012, exchange: 'NSE' },
  'HDFCBANK': { name: 'HDFC Bank Ltd.', spot: 1680.00, step: 10, vol: 0.010, exchange: 'NSE' },
  'ICICIBANK': { name: 'ICICI Bank Ltd.', spot: 1240.00, step: 10, vol: 0.011, exchange: 'NSE' },
  'TATAMOTORS': { name: 'Tata Motors Ltd.', spot: 980.00, step: 10, vol: 0.014, exchange: 'NSE' },
  'TRENT': { name: 'Trent Ltd.', spot: 7400.00, step: 50, vol: 0.018, exchange: 'NSE' },
  'SBIN': { name: 'State Bank of India', spot: 820.00, step: 10, vol: 0.012, exchange: 'NSE' },
  'BHARTIARTL': { name: 'Bharti Airtel Ltd.', spot: 1620.00, step: 20, vol: 0.010, exchange: 'NSE' },
  'BAJFINANCE': { name: 'Bajaj Finance Ltd.', spot: 7100.00, step: 50, vol: 0.013, exchange: 'NSE' },
  
  // Equities featured in Reference Image 2
  'TTML': { name: 'Tata Teleservices (Maharashtra) Limited', spot: 37.56, step: 0.5, vol: 0.025, exchange: 'NSE' },
  'BCG': { name: 'Brightcom Group Ltd.', spot: 12.40, step: 0.2, vol: 0.030, exchange: 'BSE' },
  'SUZLON': { name: 'Suzlon Energy Ltd.', spot: 65.00, step: 1.0, vol: 0.022, exchange: 'NSE' },
  'RPOWER': { name: 'Reliance Power Ltd.', spot: 42.00, step: 0.5, vol: 0.024, exchange: 'NSE' },
  'YESBANK': { name: 'Yes Bank Ltd.', spot: 20.00, step: 0.2, vol: 0.018, exchange: 'NSE' },
};

// Dynamic trading days generator up to today
function getRecentTradingDays(requestedDays = 15) {
  const days = [];
  const now = new Date();
  const cur = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  while (days.length < requestedDays) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Saturday & Sunday
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      days.unshift(`${yyyy}-${mm}-${dd}`);
    }
    cur.setDate(cur.getDate() - 1);
  }
  return days;
}

// Minutes per candle for each Zerodha timeframe
const TIMEFRAME_MINUTES = {
  '1m': 1,
  '2m': 2,
  '3m': 3,
  '4m': 4,
  '5m': 5,
  '10m': 10,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '3h': 180,
  '4h': 240,
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
};

/**
 * Generate realistic multi-day intraday candles strictly for market hours (09:15 to 15:30 IST)
 * across the last 15 trading days up to the current live moment.
 */
function generateCandles(symbol = 'NIFTY', timeframe = '5m', requestedDays = 15) {
  const meta = BASE_PRICES[symbol] || { name: symbol, spot: 23053.10, step: 50, vol: 0.01, exchange: 'NSE' };
  
  // Tie spot to liveEngine latestData or multiSpots if available
  let baseSpot = meta.spot;
  try {
    if (symbol === 'NIFTY' && liveEngine?.latestData?.spot) {
      baseSpot = liveEngine.latestData.spot;
    } else if (liveEngine?.multiSpots?.[symbol]?.spot) {
      baseSpot = liveEngine.multiSpots[symbol].spot;
    }
  } catch (_) {}

  const vol = meta.vol || 0.01;

  // Dynamically resolve trading days
  const numDays = Math.max(1, parseInt(requestedDays) || 15);
  const activeDays = getRecentTradingDays(numDays);

  const symSeed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const tfMins = TIMEFRAME_MINUTES[timeframe] || 5;

  const candles = [];
  let runningClose = baseSpot * (1 - vol * 1.8);

  // Daily mode
  if (tfMins === '1D' || tfMins === '1W' || tfMins === '1M') {
    activeDays.forEach((dateStr, dIdx) => {
      const dateObj = new Date(`${dateStr}T15:30:00+05:30`);
      const timeSec = Math.floor(dateObj.getTime() / 1000);
      const progress = dIdx / activeDays.length;

      const dayTrend = Math.sin(progress * Math.PI * 2.5 + symSeed % 5) * (baseSpot * vol * 2.2);
      const open = Number(runningClose.toFixed(2));
      const close = Number((dIdx === activeDays.length - 1 ? baseSpot : baseSpot * 0.95 + dayTrend).toFixed(2));
      const high = Number((Math.max(open, close) + Math.abs(close - open) * 0.6 + baseSpot * vol * 0.5).toFixed(2));
      const low = Number((Math.min(open, close) - Math.abs(close - open) * 0.6 - baseSpot * vol * 0.5).toFixed(2));
      const volume = Math.round(500000 + Math.abs(Math.sin(dIdx)) * 1200000);

      candles.push({
        time: timeSec,
        open,
        high,
        low,
        close,
        volume,
      });
      runningClose = close;
    });
    return candles;
  }

  // Intraday mode (1m to 4h)
  const stepMins = typeof tfMins === 'number' ? tfMins : 5;
  const totalMinsPerDay = 375; // 09:15 to 15:30 is exactly 375 minutes

  // Calculate current elapsed trading minutes if today is the active day
  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const todayYmd = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-${String(istNow.getDate()).padStart(2, '0')}`;
  const istMinutesFromMidnight = istNow.getHours() * 60 + istNow.getMinutes();
  const istMinutesElapsedToday = istMinutesFromMidnight - (9 * 60 + 15);

  activeDays.forEach((dateStr, dIdx) => {
    const isToday = dateStr === todayYmd;
    let minsForThisDay = totalMinsPerDay;

    if (isToday) {
      if (istMinutesElapsedToday <= 0) {
        // Market hasn't opened today yet; show up to 1st bar
        minsForThisDay = stepMins;
      } else if (istMinutesElapsedToday >= totalMinsPerDay) {
        // Market closed today; show all 375 minutes
        minsForThisDay = totalMinsPerDay;
      } else {
        // Currently in market hours: show bars up to current interval
        minsForThisDay = Math.min(totalMinsPerDay, Math.max(stepMins, Math.floor(istMinutesElapsedToday / stepMins) * stepMins + stepMins));
      }
    }

    const dayProgress = dIdx / activeDays.length;
    const dayBase = baseSpot * (0.94 + dayProgress * 0.06);

    for (let m = 0; m < minsForThisDay; m += stepMins) {
      const totalMinutesFromMidnight = 9 * 60 + 15 + m;
      const hh = Math.floor(totalMinutesFromMidnight / 60);
      const mm = totalMinutesFromMidnight % 60;
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const dateObj = new Date(`${dateStr}T${timeStr}:00+05:30`);
      const timeSec = Math.floor(dateObj.getTime() / 1000);

      const intradayFrac = m / totalMinsPerDay;
      const wave = Math.sin(intradayFrac * Math.PI * 3 + (dIdx * 1.3) + symSeed) * (baseSpot * vol * 0.5);
      const noise = (Math.cos((dIdx * 100 + m) * 0.3) * 0.5 + Math.sin(m * 0.7) * 0.5) * (baseSpot * vol * 0.3);

      const open = Number(runningClose.toFixed(2));
      let close = Number((dayBase + wave + noise).toFixed(2));

      // Ensure last candle of today lands exactly on live real-time spot
      const isVeryLastCandle = (dIdx === activeDays.length - 1 && m + stepMins >= minsForThisDay);
      if (isVeryLastCandle) {
        close = Number(baseSpot.toFixed(2));
      }

      const spread = Math.abs(close - open);
      const wickPad = Math.max(meta.step * 0.1, baseSpot * vol * 0.15);
      const high = Number((Math.max(open, close) + wickPad + (spread * 0.3)).toFixed(2));
      const low = Number((Math.max(0.5, Math.min(open, close) - wickPad - (spread * 0.3))).toFixed(2));
      const volume = Math.round(15000 + Math.abs(Math.sin(m + dIdx)) * 65000);

      candles.push({
        time: timeSec,
        open,
        high,
        low,
        close,
        volume,
      });

      runningClose = close;
    }
  });

  return candles;
}

// GET /api/charts/candles
router.get('/candles', (req, res) => {
  try {
    const {
      symbol = 'NIFTY',
      timeframe = '5m',
      days = 15,
    } = req.query;

    const sym = symbol.toUpperCase();
    const meta = BASE_PRICES[sym] || { name: sym, exchange: 'NSE' };
    const candles = generateCandles(sym, timeframe, days);

    res.json({
      success: true,
      symbol: sym,
      instrumentName: meta.name,
      exchange: meta.exchange,
      timeframe,
      days: parseInt(days) || 15,
      total: candles.length,
      candles,
      dhanTime: liveEngine?.latestData?.updatedAt || formatIstDateTime(),
      timeFormatted: liveEngine?.latestData?.updatedAt || formatIstDateTime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Fetch candles error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

