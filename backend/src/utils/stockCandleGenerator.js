const { aggregateCandles } = require('./candleAggregator');
/**
 * Stock Candle Generator
 * Synthesizes realistic historical candles for any stock/instrument
 * with authentic OHLC volatility, intraday time stamps (e.g., 09:45 am),
 * volume, and OI data across custom date ranges.
 */

function formatMarketTime(slotStr) {
  const [hStr, mStr] = slotStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMarketDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTH_NAMES[d.getMonth()];
  const yr = d.getFullYear();
  return `${day} ${mon} ${yr}`;
}

function parseDate(dateStr, defaultDate) {
  if (!dateStr) return defaultDate;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? defaultDate : d;
}

/**
 * Generate candles for a specific stock across a date range
 * @param {Object} stock - { symbol, name, basePrice, lotSize }
 * @param {string} fromDate - 'YYYY-MM-DD'
 * @param {string} toDate - 'YYYY-MM-DD'
 * @param {string} timeframe - '1m' | '3m' | '5m' | '15m' | '1D'
 */
function generateStockCandles(stock, fromDate, toDate, timeframe = '5m') {
  const basePrice = Number(stock.basePrice) || 1000;
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000)); // 6 months ago
  const start = parseDate(fromDate, defaultFrom);
  const end = parseDate(toDate, now);

  const isHigher = ['1W', '1M', '3M', '1Y'].includes(timeframe.toUpperCase());
  const isDaily = timeframe.toUpperCase() === '1D' || isHigher;

  // Intraday bar time slots (NSE market hours: 09:15 AM to 03:30 PM)
  const intradaySlots = isDaily
    ? ['09:15:00']
    : [
        '09:15:00', '09:45:00', '10:15:00', '10:45:00', '11:30:00',
        '12:15:00', '13:00:00', '13:45:00', '14:30:00', '15:15:00',
      ];

  const candles = [];
  let currentPrice = basePrice * (0.92 + (Math.sin(stock.symbol.length) * 0.05));

  // Volatility percentage based on asset class
  const dailyVolPct = basePrice < 100 ? 0.035 : basePrice < 1000 ? 0.022 : 0.015;
  const barVolPct = isDaily ? dailyVolPct : (dailyVolPct / 3);

  const cur = new Date(start);
  let barIndex = 0;

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    // Skip weekends (Saturday: 6, Sunday: 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dateFormatted = formatMarketDate(cur);

      for (const timeSlot of intradaySlots) {
        barIndex++;
        const dateTimeStr = `${dateStr}T${timeSlot}`;
        const barDateObj = new Date(`${dateStr}T${timeSlot}Z`);

        // Natural harmonic wave cycle without artificial plunges
        const wave = Math.sin((barIndex + stock.symbol.charCodeAt(0)) / 14);
        const cycle = Math.cos((barIndex * 0.3) + (stock.symbol.charCodeAt(1) || 0));
        const drift = (wave * 0.6) + (cycle * 0.4);

        const open = currentPrice;
        const delta = open * barVolPct * drift;
        const close = Math.max(1, open + delta);
        const high = Math.max(open, close) + (Math.abs(delta) * 0.45) + (open * barVolPct * 0.2);
        const low = Math.max(0.5, Math.min(open, close) - (Math.abs(delta) * 0.45) - (open * barVolPct * 0.2));
        
        currentPrice = close;

        const volume = Math.floor(stock.lotSize * 80 + Math.abs(delta * 2000) + 15000);
        const oi = Math.floor(stock.lotSize * 500 + (barIndex * 1200));

        const timeLabel = formatMarketTime(timeSlot);
        const timeFormatted = `${dateFormatted}, ${timeLabel}`;

        candles.push({
          date: dateStr,
          time: timeSlot.substring(0, 5),
          timeLabel,
          timeFormatted,
          timestamp: barDateObj.toISOString(),
          timeMs: barDateObj.getTime(),
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume,
          oi,
        });
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Normalize series so the latest closing price aligns precisely with basePrice (closing price of Friday 30 Oct 2026)
  if (candles.length > 0) {
    const finalClose = candles[candles.length - 1].close;
    if (finalClose > 0) {
      const scale = basePrice / finalClose;
      candles.forEach(c => {
        c.open = Number((c.open * scale).toFixed(2));
        c.high = Number((c.high * scale).toFixed(2));
        c.low = Number((c.low * scale).toFixed(2));
        c.close = Number((c.close * scale).toFixed(2));
      });
    }
  }

  const out = isHigher ? aggregateCandles(candles, timeframe) : candles;
  return out;
}

module.exports = {
  generateStockCandles,
  formatMarketTime,
  formatMarketDate,
};
