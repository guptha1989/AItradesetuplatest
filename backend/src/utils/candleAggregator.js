/**
 * Candle Aggregator
 * Aggregates finer-granularity candles (1D, 5m, etc.) into higher timeframes:
 * 1W (1 Week), 1M (1 Month), 3M (3 Months / Quarter), 1Y (1 Year).
 */

function aggregateCandles(candles, targetTimeframe) {
  if (!candles || candles.length === 0) return [];
  const tf = String(targetTimeframe || '1D').toUpperCase().trim();

  // If already matches daily or intraday, return as-is
  if (tf === '1D' || tf.endsWith('M') && parseInt(tf, 10) < 60 && !['1M', '3M'].includes(tf)) {
    return candles;
  }

  if (!['1W', '1M', '3M', '1Y'].includes(tf)) {
    return candles;
  }

  const groups = new Map();

  for (const c of candles) {
    const d = new Date(c.timeMs || (c.date + 'T09:15:00Z'));
    if (isNaN(d.getTime())) continue;

    const yr = d.getFullYear();
    const mo = d.getMonth(); // 0 to 11
    let key = '';

    if (tf === '1W') {
      // Group by week (starting Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      key = `${monday.getFullYear()}-W${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    } else if (tf === '1M') {
      key = `${yr}-${String(mo + 1).padStart(2, '0')}`;
    } else if (tf === '3M') {
      const q = Math.floor(mo / 3) + 1;
      key = `${yr}-Q${q}`;
    } else if (tf === '1Y') {
      key = `${yr}`;
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const aggregated = [];

  for (const [key, bars] of groups.entries()) {
    if (bars.length === 0) continue;
    const firstBar = bars[0];
    const lastBar = bars[bars.length - 1];

    let high = -Infinity;
    let low = Infinity;
    let volume = 0;

    for (const b of bars) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += (Number(b.volume) || 0);
    }

    const d = new Date(lastBar.timeMs || (lastBar.date + 'T15:30:00Z'));
    const mon = MONTH_NAMES[d.getMonth()] || 'M';
    const yr = d.getFullYear();

    let displayLabel = lastBar.timeFormatted || lastBar.date;
    if (tf === '1W') {
      displayLabel = `Week of ${key.replace(/^.*-W/, '')} (${lastBar.date})`;
    } else if (tf === '1M') {
      displayLabel = `${mon} ${yr} (Monthly)`;
    } else if (tf === '3M') {
      displayLabel = `${key} [${mon} ${yr}] (3M)`;
    } else if (tf === '1Y') {
      displayLabel = `Year ${yr} (Annual)`;
    }

    aggregated.push({
      date: lastBar.date,
      time: '15:30',
      timeLabel: 'EOD',
      timeFormatted: displayLabel,
      timestamp: lastBar.timestamp || d.toISOString(),
      timeMs: lastBar.timeMs || d.getTime(),
      open: Number(firstBar.open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(lastBar.close.toFixed(2)),
      volume,
      oi: lastBar.oi || 0,
      constituentBarsCount: bars.length,
    });
  }

  return aggregated;
}

module.exports = { aggregateCandles };

