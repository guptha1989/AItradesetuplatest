/**
 * Pine Script & Technical Indicators Engine
 * Provides accurate Zerodha / TradingView mathematical indicator algorithms
 * and a real-time Pine Script parser & evaluator.
 */

// ─── MATHEMATICAL INDICATORS ──────────────────────────────────────────────────

export function calculateSMA(data, period = 14, key = 'close') {
  const result = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const val = typeof data[i] === 'object' ? data[i][key] : data[i];
    sum += val;
    if (i >= period) {
      const prevVal = typeof data[i - period] === 'object' ? data[i - period][key] : data[i - period];
      sum -= prevVal;
    }
    if (i >= period - 1) {
      result[i] = Number((sum / period).toFixed(2));
    }
  }
  return result;
}

export function calculateEMA(data, period = 14, key = 'close') {
  const result = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  let ema = null;

  for (let i = 0; i < data.length; i++) {
    const val = typeof data[i] === 'object' ? data[i][key] : data[i];
    if (i < period - 1) continue;
    if (ema === null) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += (typeof data[j] === 'object' ? data[j][key] : data[j]);
      }
      ema = sum / period;
    } else {
      ema = (val * k) + (ema * (1 - k));
    }
    result[i] = Number(ema.toFixed(2));
  }
  return result;
}

export function calculateRSI(candles, period = 14) {
  const result = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = Number((100 - (100 / (1 + rs))).toFixed(2));

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = Number((100 - (100 / (1 + rs))).toFixed(2));
  }

  return result;
}

export function calculateMACD(candles, fast = 12, slow = 26, signal = 9) {
  const fastEMA = calculateEMA(candles, fast);
  const slowEMA = calculateEMA(candles, slow);
  const macdLine = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = Number((fastEMA[i] - slowEMA[i]).toFixed(2));
    }
  }

  // Signal line is EMA of MACD Line
  const validMacd = macdLine.map(v => v === null ? 0 : v);
  const signalLine = calculateEMA(validMacd, signal);
  const histogram = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = Number((macdLine[i] - signalLine[i]).toFixed(2));
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateATR(candles, period = 14) {
  const tr = new Array(candles.length).fill(0);
  tr[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  return calculateSMA(tr, period);
}

export function calculateSupertrend(candles, period = 10, multiplier = 3) {
  const atr = calculateATR(candles, period);
  const supertrend = new Array(candles.length).fill(null);
  const direction = new Array(candles.length).fill(1); // 1 = Bullish (Green), -1 = Bearish (Red)

  let prevUpper = null;
  let prevLower = null;
  let prevTrend = 1;
  let isInitialized = false;

  for (let i = 0; i < candles.length; i++) {
    if (atr[i] === null) continue;

    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUpper = hl2 + (multiplier * atr[i]);
    const basicLower = hl2 - (multiplier * atr[i]);

    if (!isInitialized) {
      prevUpper = basicUpper;
      prevLower = basicLower;
      prevTrend = candles[i].close >= basicLower ? 1 : -1;
      isInitialized = true;
    }

    let finalUpper = (basicUpper < prevUpper || (candles[i - 1] && candles[i - 1].close > prevUpper)) ? basicUpper : prevUpper;
    let finalLower = (basicLower > prevLower || (candles[i - 1] && candles[i - 1].close < prevLower)) ? basicLower : prevLower;

    let currentTrend = prevTrend;
    if (prevTrend === 1 && candles[i].close < finalLower) {
      currentTrend = -1;
    } else if (prevTrend === -1 && candles[i].close > finalUpper) {
      currentTrend = 1;
    }

    direction[i] = currentTrend;
    supertrend[i] = Number((currentTrend === 1 ? finalLower : finalUpper).toFixed(2));

    prevUpper = finalUpper;
    prevLower = finalLower;
    prevTrend = currentTrend;
  }

  return { supertrend, direction };
}

export function calculateBollingerBands(candles, period = 20, mult = 2) {
  const sma = calculateSMA(candles, period);
  const upper = new Array(candles.length).fill(null);
  const lower = new Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i++) {
    let sumSquares = 0;
    const mean = sma[i];
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - mean;
      sumSquares += diff * diff;
    }
    const stdDev = Math.sqrt(sumSquares / period);
    upper[i] = Number((mean + (mult * stdDev)).toFixed(2));
    lower[i] = Number((mean - (mult * stdDev)).toFixed(2));
  }

  return { basis: sma, upper, lower };
}

export function calculateVWAP(candles) {
  const vwap = new Array(candles.length).fill(null);
  let cumVol = 0;
  let cumVolPrice = 0;
  let currentSessionDay = null;

  for (let i = 0; i < candles.length; i++) {
    // Reset intraday cumulative values at 09:15 session start of each trading day
    const sessionDay = new Date(candles[i].time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    if (sessionDay !== currentSessionDay) {
      currentSessionDay = sessionDay;
      cumVol = 0;
      cumVolPrice = 0;
    }

    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const volume = candles[i].volume || 1000;

    cumVolPrice += typicalPrice * volume;
    cumVol += volume;

    vwap[i] = Number((cumVolPrice / Math.max(1, cumVol)).toFixed(2));
  }

  return vwap;
}

export function calculatePivots(candles) {
  if (!candles.length) return {};
  const last = candles[candles.length - 1];
  const h = last.high;
  const l = last.low;
  const c = last.close;

  const p = Number(((h + l + c) / 3).toFixed(2));
  const r1 = Number(((2 * p) - l).toFixed(2));
  const s1 = Number(((2 * p) - h).toFixed(2));
  const r2 = Number((p + (h - l)).toFixed(2));
  const s2 = Number((p - (h - l)).toFixed(2));
  const r3 = Number((h + 2 * (p - l)).toFixed(2));
  const s3 = Number((l - 2 * (h - p)).toFixed(2));

  return { p, r1, s1, r2, s2, r3, s3 };
}

export function calculateADX(candles, length = 14) {
  const adx = new Array(candles.length).fill(null);
  const plusDI = new Array(candles.length).fill(null);
  const minusDI = new Array(candles.length).fill(null);

  if (candles.length < length * 2) return { adx, plusDI, minusDI };

  const plusDM = [];
  const minusDM = [];
  const tr = [];

  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    plusDM.push((upMove > downMove && upMove > 0) ? upMove : 0);
    minusDM.push((downMove > upMove && downMove > 0) ? downMove : 0);

    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }

  const smoothedTR = calculateSMA(tr, length);
  const smoothedPlusDM = calculateSMA(plusDM, length);
  const smoothedMinusDM = calculateSMA(minusDM, length);

  const dx = [];
  for (let i = 0; i < smoothedTR.length; i++) {
    if (smoothedTR[i] && smoothedTR[i] > 0) {
      const pDI = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
      const mDI = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
      plusDI[i + 1] = Number(pDI.toFixed(1));
      minusDI[i + 1] = Number(mDI.toFixed(1));

      const sum = pDI + mDI;
      const diff = Math.abs(pDI - mDI);
      dx.push(sum > 0 ? (diff / sum) * 100 : 0);
    } else {
      dx.push(0);
    }
  }

  const smoothedADX = calculateSMA(dx, length);
  for (let i = 0; i < smoothedADX.length; i++) {
    if (smoothedADX[i] !== null) {
      adx[i + 1] = Number(smoothedADX[i].toFixed(1));
    }
  }

  return { adx, plusDI, minusDI };
}

export function calculateKeltner(candles, length = 20, mult = 2, atrLength = 10) {
  const ema = calculateEMA(candles, length);
  const atr = calculateATR(candles, atrLength);
  const upper = new Array(candles.length).fill(null);
  const lower = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    if (ema[i] !== null && atr[i] !== null) {
      upper[i] = Number((ema[i] + (mult * atr[i])).toFixed(2));
      lower[i] = Number((ema[i] - (mult * atr[i])).toFixed(2));
    }
  }

  return { middle: ema, upper, lower };
}

export function calculateDonchian(candles, length = 20) {
  const upper = new Array(candles.length).fill(null);
  const lower = new Array(candles.length).fill(null);
  const middle = new Array(candles.length).fill(null);

  for (let i = length - 1; i < candles.length; i++) {
    let maxHigh = -Infinity;
    let minLow = Infinity;
    for (let j = 0; j < length; j++) {
      maxHigh = Math.max(maxHigh, candles[i - j].high);
      minLow = Math.min(minLow, candles[i - j].low);
    }
    upper[i] = Number(maxHigh.toFixed(2));
    lower[i] = Number(minLow.toFixed(2));
    middle[i] = Number(((maxHigh + minLow) / 2).toFixed(2));
  }

  return { upper, lower, middle };
}

// ─── CANDLE TRANSFORMATION HELPERS ────────────────────────────────────────────

export function calculateHeikinAshi(candles) {
  const ha = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    ha.push({
      time: c.time,
      open: Number(haOpen.toFixed(2)),
      high: Number(haHigh.toFixed(2)),
      low: Number(haLow.toFixed(2)),
      close: Number(haClose.toFixed(2)),
      volume: c.volume,
    });
  }
  return ha;
}

export function calculateRenko(candles, boxSize = 10) {
  if (!candles || candles.length === 0) return [];
  const renko = [];
  let lastPrice = Math.floor(candles[0].close / boxSize) * boxSize;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const diff = c.close - lastPrice;

    if (diff >= boxSize) {
      const count = Math.floor(diff / boxSize);
      for (let b = 0; b < count; b++) {
        const open = lastPrice;
        const close = open + boxSize;
        renko.push({
          time: c.time + b,
          open,
          high: close,
          low: open,
          close,
          color: '#10b981',
          volume: Math.round(c.volume / count),
          type: 'UP',
        });
        lastPrice = close;
      }
    } else if (diff <= -boxSize) {
      const count = Math.floor(Math.abs(diff) / boxSize);
      for (let b = 0; b < count; b++) {
        const open = lastPrice;
        const close = open - boxSize;
        renko.push({
          time: c.time + b,
          open,
          high: open,
          low: close,
          close,
          color: '#ef4444',
          volume: Math.round(c.volume / count),
          type: 'DOWN',
        });
        lastPrice = close;
      }
    }
  }

  return renko.length > 0 ? renko : candles;
}

// ─── PINE SCRIPT REAL-TIME EVALUATOR ──────────────────────────────────────────

export const PINE_SCRIPT_PRESETS = [
  {
    name: 'EMA 9/21 Ribbon & Signals',
    code: `//@version=5
indicator("EMA Ribbon & Crossover", overlay=true)
emaFast = ta.ema(close, 9)
emaSlow = ta.ema(close, 21)

plot(emaFast, title="Fast EMA (9)", color=#10b981, linewidth=2)
plot(emaSlow, title="Slow EMA (21)", color=#ef4444, linewidth=2)

bullishCross = ta.crossover(emaFast, emaSlow)
bearishCross = ta.crossunder(emaFast, emaSlow)

plotshape(bullishCross, title="Buy Signal", color=#10b981, location=location.belowbar, style=shape.triangleup)
plotshape(bearishCross, title="Sell Signal", color=#ef4444, location=location.abovebar, style=shape.triangledown)`
  },
  {
    name: 'SuperTrend AI Scalper',
    code: `//@version=5
indicator("SuperTrend Scalper", overlay=true)
st = ta.supertrend(close, 10, 3.0)
plot(st, title="SuperTrend", color=#3b82f6, linewidth=2)

bullCross = ta.crossover(close, st)
bearCross = ta.crossunder(close, st)

plotshape(bullCross, title="Long Entry", color=#22c55e, location=location.belowbar, style=shape.arrowup)
plotshape(bearCross, title="Short Entry", color=#f43f5e, location=location.abovebar, style=shape.arrowdown)`
  },
  {
    name: 'Bollinger Bands & Mean Reversion',
    code: `//@version=5
indicator("Bollinger Bands Pro", overlay=true)
basis = ta.sma(close, 20)
upper = ta.bollinger_upper(close, 20, 2)
lower = ta.bollinger_lower(close, 20, 2)

plot(basis, title="Basis (20)", color=#f59e0b, linewidth=1)
plot(upper, title="Upper Band", color=#3b82f6, linewidth=1)
plot(lower, title="Lower Band", color=#3b82f6, linewidth=1)`
  }
];

export function runPineScript(scriptText, candles) {
  if (!candles || candles.length === 0) return { plots: [], shapes: [], hlines: [], error: null };

  const plots = [];
  const shapes = [];
  const hlines = [];
  let error = null;

  try {
    const lines = scriptText.split('\n');
    const variables = {};

    // Helper arrays from candles
    const closeSeries = candles.map(c => c.close);
    const openSeries = candles.map(c => c.open);
    const highSeries = candles.map(c => c.high);
    const lowSeries = candles.map(c => c.low);
    const volumeSeries = candles.map(c => c.volume);

    variables['close'] = closeSeries;
    variables['open'] = openSeries;
    variables['high'] = highSeries;
    variables['low'] = lowSeries;
    variables['volume'] = volumeSeries;

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('//') || line.startsWith('indicator(')) continue;

      // 1. Check for assignments: var = ta.func(...)
      const assignMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const expr = assignMatch[2];

        // ta.ema(source, length)
        const emaMatch = expr.match(/ta\.ema\(\s*([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*\)/);
        if (emaMatch) {
          const srcKey = emaMatch[1];
          const len = parseInt(emaMatch[2]);
          const src = variables[srcKey] || closeSeries;
          variables[varName] = calculateEMA(src, len);
          continue;
        }

        // ta.sma(source, length)
        const smaMatch = expr.match(/ta\.sma\(\s*([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*\)/);
        if (smaMatch) {
          const srcKey = smaMatch[1];
          const len = parseInt(smaMatch[2]);
          const src = variables[srcKey] || closeSeries;
          variables[varName] = calculateSMA(src, len);
          continue;
        }

        // ta.rsi(source, length)
        const rsiMatch = expr.match(/ta\.rsi\(\s*([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*\)/);
        if (rsiMatch) {
          const len = parseInt(rsiMatch[2]);
          variables[varName] = calculateRSI(candles, len);
          continue;
        }

        // ta.supertrend(source, period, mult)
        const stMatch = expr.match(/ta\.supertrend\(\s*([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
        if (stMatch) {
          const period = parseInt(stMatch[2]);
          const mult = parseFloat(stMatch[3]);
          const stRes = calculateSupertrend(candles, period, mult);
          variables[varName] = stRes.supertrend;
          continue;
        }

        // ta.bollinger_upper / lower
        const bbUpperMatch = expr.match(/ta\.bollinger_upper\(\s*([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
        if (bbUpperMatch) {
          const period = parseInt(bbUpperMatch[2]);
          const mult = parseFloat(bbUpperMatch[3]);
          const bb = calculateBollingerBands(candles, period, mult);
          variables[varName] = bb.upper;
          continue;
        }

        const bbLowerMatch = expr.match(/ta\.bollinger_lower\(\s*([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
        if (bbLowerMatch) {
          const period = parseInt(bbLowerMatch[2]);
          const mult = parseFloat(bbLowerMatch[3]);
          const bb = calculateBollingerBands(candles, period, mult);
          variables[varName] = bb.lower;
          continue;
        }

        // ta.crossover(a, b)
        const crossOverMatch = expr.match(/ta\.crossover\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/);
        if (crossOverMatch) {
          const a = variables[crossOverMatch[1]];
          const b = variables[crossOverMatch[2]];
          const boolSeries = new Array(candles.length).fill(false);
          if (a && b) {
            for (let i = 1; i < candles.length; i++) {
              if (a[i - 1] !== null && b[i - 1] !== null && a[i] !== null && b[i] !== null) {
                if (a[i - 1] <= b[i - 1] && a[i] > b[i]) {
                  boolSeries[i] = true;
                }
              }
            }
          }
          variables[varName] = boolSeries;
          continue;
        }

        // ta.crossunder(a, b)
        const crossUnderMatch = expr.match(/ta\.crossunder\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)/);
        if (crossUnderMatch) {
          const a = variables[crossUnderMatch[1]];
          const b = variables[crossUnderMatch[2]];
          const boolSeries = new Array(candles.length).fill(false);
          if (a && b) {
            for (let i = 1; i < candles.length; i++) {
              if (a[i - 1] !== null && b[i - 1] !== null && a[i] !== null && b[i] !== null) {
                if (a[i - 1] >= b[i - 1] && a[i] < b[i]) {
                  boolSeries[i] = true;
                }
              }
            }
          }
          variables[varName] = boolSeries;
          continue;
        }
      }

      // 2. Check for plot(series, title=..., color=...)
      const plotMatch = line.match(/^plot\(\s*([a-zA-Z0-9_]+)/);
      if (plotMatch) {
        const varName = plotMatch[1];
        const seriesData = variables[varName];
        if (seriesData) {
          let title = varName;
          const titleMatch = line.match(/title\s*=\s*["']([^"']+)["']/);
          if (titleMatch) title = titleMatch[1];

          let color = '#3b82f6';
          const colorMatch = line.match(/color\s*=\s*(#[a-fA-F0-9]{3,8}|[a-zA-Z0-9_.]+)/);
          if (colorMatch) {
            color = colorMatch[1].startsWith('#') ? colorMatch[1] : '#10b981';
          }

          let linewidth = 1.5;
          const widthMatch = line.match(/linewidth\s*=\s*(\d+)/);
          if (widthMatch) linewidth = parseInt(widthMatch[1]);

          plots.push({
            name: title,
            color,
            linewidth,
            data: seriesData,
          });
        }
        continue;
      }

      // 3. Check for plotshape(condition, title=..., color=..., location=...)
      const shapeMatch = line.match(/^plotshape\(\s*([a-zA-Z0-9_]+)/);
      if (shapeMatch) {
        const varName = shapeMatch[1];
        const boolSeries = variables[varName];
        if (boolSeries) {
          let title = varName;
          const titleMatch = line.match(/title\s*=\s*["']([^"']+)["']/);
          if (titleMatch) title = titleMatch[1];

          let color = '#10b981';
          const colorMatch = line.match(/color\s*=\s*(#[a-fA-F0-9]{3,8}|[a-zA-Z0-9_.]+)/);
          if (colorMatch) {
            color = colorMatch[1].startsWith('#') ? colorMatch[1] : (title.toLowerCase().includes('sell') ? '#ef4444' : '#10b981');
          }

          const isBelow = line.includes('location.belowbar');
          const shapeSignals = [];

          for (let i = 0; i < boolSeries.length; i++) {
            if (boolSeries[i]) {
              shapeSignals.push({
                index: i,
                time: candles[i].time,
                price: isBelow ? candles[i].low : candles[i].high,
                position: isBelow ? 'belowBar' : 'aboveBar',
                shape: isBelow ? 'arrowUp' : 'arrowDown',
                color,
                text: title,
              });
            }
          }

          shapes.push(...shapeSignals);
        }
        continue;
      }
    }
  } catch (err) {
    error = err.message;
  }

  return { plots, shapes, hlines, error };
}

