/**
 * Comprehensive Technical Indicators Library
 * 
 * Supports:
 * - Donchian Channels (Multiple periods)
 * - Bollinger Bands (Multiple periods & multipliers)
 * - RSI (Multiple periods, Wilder's smoothing)
 * - ADX & DMI (+DI, -DI, ADX)
 * - MACD (Fast, Slow, Signal, Histogram)
 * - EMA (Multiple periods)
 * - VWAP (Cumulative Volume Weighted Average Price + StdDev bands)
 * - Volume (SMA, Spike/Surge detection)
 * - OI (Open Interest, PCR, Build-up analysis)
 * - Custom TradingView-style Expression Parser & Evaluator
 */

// ─── Basic Math Utilities ─────────────────────────────────────────────────────

function sma(values, period) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += (values[i] || 0);
  result[period - 1] = sum / period;
  
  for (let i = period; i < values.length; i++) {
    sum += (values[i] || 0) - (values[i - period] || 0);
    result[i] = sum / period;
  }
  return result;
}

function ema(values, period) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;
  
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += (values[i] || 0);
  let prevEma = sum / period;
  result[period - 1] = prevEma;
  
  for (let i = period; i < values.length; i++) {
    const val = values[i] !== undefined && values[i] !== null ? values[i] : prevEma;
    prevEma = val * k + prevEma * (1 - k);
    result[i] = prevEma;
  }
  return result;
}

function stdDev(values, period, maValues) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;
  
  for (let i = period - 1; i < values.length; i++) {
    const mean = maValues[i];
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow((values[j] || 0) - mean, 2);
    }
    result[i] = Math.sqrt(varianceSum / period);
  }
  return result;
}

// ─── 1. Donchian Channels ────────────────────────────────────────────────────

/**
 * Calculates Donchian Channels for a given period
 * Upper = Highest High over period
 * Lower = Lowest Low over period
 * Middle = (Upper + Lower) / 2
 */
function calcDonchian(candles, period = 20) {
  const highs = candles.map(c => c.high !== undefined ? c.high : c.close);
  const lows = candles.map(c => c.low !== undefined ? c.low : c.close);
  const n = candles.length;
  
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  
  for (let i = 1; i < n; i++) {
    const startIdx = Math.max(0, i - period);
    let maxH = -Infinity;
    let minL = Infinity;
    // Standard Donchian lookback evaluates preceding N bars prior to current bar i
    // so that current bar price breakout above/below channel is detected accurately.
    for (let j = startIdx; j < i; j++) {
      if (highs[j] > maxH) maxH = highs[j];
      if (lows[j] < minL) minL = lows[j];
    }
    if (maxH !== -Infinity && minL !== Infinity) {
      upper[i] = maxH;
      lower[i] = minL;
      middle[i] = (maxH + minL) / 2;
    }
  }

  // Handle bar 0
  if (n > 0) {
    upper[0] = highs[0];
    lower[0] = lows[0];
    middle[0] = (highs[0] + lows[0]) / 2;
  }
  
  return { upper, lower, middle, period };
}

// ─── 2. Bollinger Bands ──────────────────────────────────────────────────────

/**
 * Calculates Bollinger Bands
 * Middle = SMA(close, period)
 * Upper = Middle + (stdDevMultiplier * StdDev)
 * Lower = Middle - (stdDevMultiplier * StdDev)
 * Bandwidth = (Upper - Lower) / Middle
 * PercentB = (Close - Lower) / (Upper - Lower)
 */
function calcBollinger(candles, period = 20, stdDevMultiplier = 2) {
  const closes = candles.map(c => c.close);
  const middle = sma(closes, period);
  const sdev = stdDev(closes, period, middle);
  const n = candles.length;
  
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const bandwidth = new Array(n).fill(null);
  const percentB = new Array(n).fill(null);
  
  for (let i = 0; i < n; i++) {
    if (middle[i] !== null && sdev[i] !== null) {
      upper[i] = middle[i] + stdDevMultiplier * sdev[i];
      lower[i] = middle[i] - stdDevMultiplier * sdev[i];
      const width = upper[i] - lower[i];
      bandwidth[i] = middle[i] !== 0 ? width / middle[i] : 0;
      percentB[i] = width !== 0 ? (closes[i] - lower[i]) / width : 0.5;
    }
  }
  
  return { middle, upper, lower, bandwidth, percentB, period, stdDevMultiplier };
}

// ─── 2B. Average True Range (ATR) & Keltner Channels ──────────────────────────

function calcATR(candles, period = 14) {
  const n = candles.length;
  const tr = new Array(n).fill(0);
  const atr = new Array(n).fill(null);
  if (n < 2) return atr;

  for (let i = 1; i < n; i++) {
    const high = candles[i].high !== undefined ? candles[i].high : candles[i].close;
    const low = candles[i].low !== undefined ? candles[i].low : candles[i].close;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  let sum = 0;
  const initLimit = Math.min(period, n - 1);
  for (let i = 1; i <= initLimit; i++) sum += tr[i];
  let prevAtr = sum / period;
  if (n > period) atr[period] = prevAtr;

  for (let i = period + 1; i < n; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    atr[i] = prevAtr;
  }
  return atr;
}

function calcKeltner(candles, period = 20, mult = 1.5, atrPeriod = 10) {
  const closes = candles.map(c => c.close);
  const middle = ema(closes, period);
  const atr = calcATR(candles, atrPeriod);
  const n = candles.length;

  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    if (middle[i] !== null && atr[i] !== null) {
      upper[i] = middle[i] + mult * atr[i];
      lower[i] = middle[i] - mult * atr[i];
    }
  }

  return { middle, upper, lower, atr, period, mult, atrPeriod };
}

// ─── 3. Relative Strength Index (RSI) ────────────────────────────────────────

/**
 * Calculates Wilder's smoothed RSI for given period
 */
function calcRSI(candles, period = 14) {
  const closes = candles.map(c => c.close);
  const n = closes.length;
  const result = new Array(n).fill(null);
  if (n <= period) return result;
  
  let gain = 0;
  let loss = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  
  let avgGain = gain / period;
  let avgLoss = loss / period;
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  
  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    
    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }
  
  return result;
}

// ─── 4. Average Directional Index (ADX) ──────────────────────────────────────

/**
 * Calculates ADX, +DI, and -DI
 */
function calcADX(candles, period = 14) {
  const n = candles.length;
  const adx = new Array(n).fill(null);
  const plusDI = new Array(n).fill(null);
  const minusDI = new Array(n).fill(null);
  
  if (n <= period * 2) return { adx, plusDI, minusDI, period };
  
  const tr = new Array(n).fill(0);
  const plusDM = new Array(n).fill(0);
  const minusDM = new Array(n).fill(0);
  
  for (let i = 1; i < n; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;
    
    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    if (upMove > downMove && upMove > 0) plusDM[i] = upMove;
    if (downMove > upMove && downMove > 0) minusDM[i] = downMove;
  }
  
  // Initial sums
  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  
  for (let i = 1; i <= period; i++) {
    smoothTR += tr[i];
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
  }
  
  plusDI[period] = smoothTR > 0 ? (100 * smoothPlusDM) / smoothTR : 0;
  minusDI[period] = smoothTR > 0 ? (100 * smoothMinusDM) / smoothTR : 0;
  
  const dx = new Array(n).fill(0);
  const sumDI = plusDI[period] + minusDI[period];
  dx[period] = sumDI > 0 ? (100 * Math.abs(plusDI[period] - minusDI[period])) / sumDI : 0;
  
  for (let i = period + 1; i < n; i++) {
    smoothTR = smoothTR - (smoothTR / period) + tr[i];
    smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDM[i];
    smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDM[i];
    
    plusDI[i] = smoothTR > 0 ? (100 * smoothPlusDM) / smoothTR : 0;
    minusDI[i] = smoothTR > 0 ? (100 * smoothMinusDM) / smoothTR : 0;
    
    const curSum = plusDI[i] + minusDI[i];
    dx[i] = curSum > 0 ? (100 * Math.abs(plusDI[i] - minusDI[i])) / curSum : 0;
  }
  
  // ADX smoothing
  let adxSum = 0;
  for (let i = period; i < period * 2; i++) {
    adxSum += dx[i];
  }
  adx[period * 2 - 1] = adxSum / period;
  
  for (let i = period * 2; i < n; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }
  
  return { adx, plusDI, minusDI, period };
}

// ─── 5. Moving Average Convergence Divergence (MACD) ─────────────────────────

function calcMACD(candles, fast = 12, slow = 26, signal = 9) {
  const closes = candles.map(c => c.close);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const n = closes.length;
  
  const macdLine = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }
  
  // Non-null sub-array for signal line calculation
  const validIdx = macdLine.findIndex(v => v !== null);
  const signalLine = new Array(n).fill(null);
  const histogram = new Array(n).fill(null);
  
  if (validIdx !== -1) {
    const validMacd = macdLine.slice(validIdx);
    const validSignal = ema(validMacd, signal);
    
    for (let i = 0; i < validSignal.length; i++) {
      const globalIdx = validIdx + i;
      signalLine[globalIdx] = validSignal[i];
      if (validSignal[i] !== null && macdLine[globalIdx] !== null) {
        histogram[globalIdx] = macdLine[globalIdx] - validSignal[i];
      }
    }
  }
  
  return { macdLine, signalLine, histogram, fast, slow, signal };
}

// ─── 6. Volume Weighted Average Price (VWAP) ──────────────────────────────────

function calcVWAP(candles) {
  const n = candles.length;
  const vwap = new Array(n).fill(null);
  const upper1 = new Array(n).fill(null);
  const lower1 = new Array(n).fill(null);
  const upper2 = new Array(n).fill(null);
  const lower2 = new Array(n).fill(null);
  
  let cumVolume = 0;
  let cumVolPrice = 0;
  let cumVolPriceDiffSq = 0;
  
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const high = c.high !== undefined ? c.high : c.close;
    const low = c.low !== undefined ? c.low : c.close;
    const close = c.close;
    const typicalPrice = (high + low + close) / 3;
    const volume = c.volume || 1;
    
    cumVolume += volume;
    cumVolPrice += typicalPrice * volume;
    
    const currentVwap = cumVolPrice / cumVolume;
    vwap[i] = currentVwap;
    
    cumVolPriceDiffSq += volume * Math.pow(typicalPrice - currentVwap, 2);
    const vwapStdDev = Math.sqrt(cumVolPriceDiffSq / cumVolume);
    
    upper1[i] = currentVwap + vwapStdDev;
    lower1[i] = currentVwap - vwapStdDev;
    upper2[i] = currentVwap + 2 * vwapStdDev;
    lower2[i] = currentVwap - 2 * vwapStdDev;
  }
  
  return { vwap, upper1, lower1, upper2, lower2 };
}

// ─── 7. Volume Indicators ────────────────────────────────────────────────────

function calcVolumeMetrics(candles, period = 20) {
  const volumes = candles.map(c => c.volume || 0);
  const volSma = sma(volumes, period);
  const n = volumes.length;
  
  const volumeRatio = new Array(n).fill(1);
  const isSpike = new Array(n).fill(false);
  
  for (let i = 0; i < n; i++) {
    if (volSma[i] && volSma[i] > 0) {
      volumeRatio[i] = volumes[i] / volSma[i];
      isSpike[i] = volumeRatio[i] >= 1.5;
    }
  }
  
  return { volumes, volSma, volumeRatio, isSpike };
}

// ─── 8. Open Interest (OI) & PCR ──────────────────────────────────────────────

function analyzeOI(candles, optionData = null) {
  const n = candles.length;
  const oiAnalysis = new Array(n).fill(null);
  
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const prevC = i > 0 ? candles[i - 1] : c;
    const oi = c.oi !== undefined ? c.oi : (optionData?.totalOI || 0);
    const prevOI = prevC.oi !== undefined ? prevC.oi : oi;
    const priceChange = c.close - prevC.close;
    const oiChange = oi - prevOI;
    
    let interpretation = 'Neutral';
    if (priceChange > 0 && oiChange > 0) interpretation = 'Long Build-Up (Bullish)';
    else if (priceChange < 0 && oiChange > 0) interpretation = 'Short Build-Up (Bearish)';
    else if (priceChange > 0 && oiChange < 0) interpretation = 'Short Covering (Bullish)';
    else if (priceChange < 0 && oiChange < 0) interpretation = 'Long Unwinding (Bearish)';
    
    oiAnalysis[i] = {
      oi,
      oiChange,
      pcr: optionData?.pcr || 1.0,
      interpretation,
      isBullish: interpretation.includes('Bullish'),
      isBearish: interpretation.includes('Bearish'),
    };
  }
  
  return oiAnalysis;
}

// ─── 9. Custom TradingView-Style Expression Parser & Evaluator ────────────────

/**
 * Parses and evaluates custom TradingView / Pine Script expressions.
 * Example expressions:
 *   "ta.crossover(close, ta.ema(close, 20)) and ta.rsi(close, 14) > 50"
 *   "close > ta.donchian_upper(20) and volume > ta.sma(volume, 20) * 1.5"
 *   "ta.rsi(close, 7) < 30 and close < ta.bb_lower(20, 2)"
 */
function evaluateCustomExpression(expression, candles, indicatorCache = {}, idx = -1) {
  if (!expression || typeof expression !== 'string' || !expression.trim()) {
    return { result: false, error: null };
  }
  
  const n = candles.length;
  const targetIdx = idx >= 0 ? idx : n - 1;
  if (targetIdx < 0 || targetIdx >= n) return { result: false, error: 'No candle data' };
  
  const c = candles[targetIdx];
  const prevC = targetIdx > 0 ? candles[targetIdx - 1] : c;
  
  // Ensure indicator cache has standard series
  const closes = candles.map(k => k.close);
  const volumes = candles.map(k => k.volume || 1);
  
  const context = {
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume || 1,
    prev_close: prevC.close,
    prev_high: prevC.high,
    prev_low: prevC.low,
    prev_open: prevC.open,
    
    // Pine-style functions
    ta: {
      ema: (src, len = 20) => {
        const cacheKey = `ema_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = ema(closes, len);
        return indicatorCache[cacheKey][targetIdx] || 0;
      },
      sma: (src, len = 20) => {
        const cacheKey = `sma_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = sma(closes, len);
        return indicatorCache[cacheKey][targetIdx] || 0;
      },
      rsi: (src, len = 14) => {
        const cacheKey = `rsi_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcRSI(candles, len);
        return indicatorCache[cacheKey][targetIdx] || 50;
      },
      donchian_upper: (len = 20) => {
        const cacheKey = `donchian_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcDonchian(candles, len);
        return indicatorCache[cacheKey].upper[targetIdx] || c.high;
      },
      donchian_lower: (len = 20) => {
        const cacheKey = `donchian_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcDonchian(candles, len);
        return indicatorCache[cacheKey].lower[targetIdx] || c.low;
      },
      donchian_middle: (len = 20) => {
        const cacheKey = `donchian_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcDonchian(candles, len);
        return indicatorCache[cacheKey].middle[targetIdx] || c.close;
      },
      bb_upper: (len = 20, mult = 2) => {
        const cacheKey = `bb_${len}_${mult}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcBollinger(candles, len, mult);
        return indicatorCache[cacheKey].upper[targetIdx] || c.close;
      },
      bb_lower: (len = 20, mult = 2) => {
        const cacheKey = `bb_${len}_${mult}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcBollinger(candles, len, mult);
        return indicatorCache[cacheKey].lower[targetIdx] || c.close;
      },
      bb_middle: (len = 20, mult = 2) => {
        const cacheKey = `bb_${len}_${mult}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcBollinger(candles, len, mult);
        return indicatorCache[cacheKey].middle[targetIdx] || c.close;
      },
      adx: (len = 14) => {
        const cacheKey = `adx_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcADX(candles, len);
        return indicatorCache[cacheKey].adx[targetIdx] || 20;
      },
      plus_di: (len = 14) => {
        const cacheKey = `adx_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcADX(candles, len);
        return indicatorCache[cacheKey].plusDI[targetIdx] || 0;
      },
      minus_di: (len = 14) => {
        const cacheKey = `adx_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcADX(candles, len);
        return indicatorCache[cacheKey].minusDI[targetIdx] || 0;
      },
      vwap: () => {
        if (!indicatorCache.vwap) indicatorCache.vwap = calcVWAP(candles);
        return indicatorCache.vwap.vwap[targetIdx] || c.close;
      },
      macd: (fast = 12, slow = 26, sig = 9) => {
        const cacheKey = `macd_${fast}_${slow}_${sig}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcMACD(candles, fast, slow, sig);
        return indicatorCache[cacheKey].macdLine[targetIdx] || 0;
      },
      macd_signal: (fast = 12, slow = 26, sig = 9) => {
        const cacheKey = `macd_${fast}_${slow}_${sig}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcMACD(candles, fast, slow, sig);
        return indicatorCache[cacheKey].signalLine[targetIdx] || 0;
      },
      macd_hist: (fast = 12, slow = 26, sig = 9) => {
        const cacheKey = `macd_${fast}_${slow}_${sig}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcMACD(candles, fast, slow, sig);
        return indicatorCache[cacheKey].histogram[targetIdx] || 0;
      },
      atr: (len = 10) => {
        const cacheKey = `atr_${len}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcATR(candles, len);
        return indicatorCache[cacheKey][targetIdx] || 0;
      },
      highest: (src, len = 20) => {
        const actualLen = typeof src === 'number' ? src : len;
        const cacheKey = `donchian_${actualLen}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcDonchian(candles, actualLen);
        return indicatorCache[cacheKey].upper[targetIdx] || c.high;
      },
      lowest: (src, len = 20) => {
        const actualLen = typeof src === 'number' ? src : len;
        const cacheKey = `donchian_${actualLen}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcDonchian(candles, actualLen);
        return indicatorCache[cacheKey].lower[targetIdx] || c.low;
      },
      stdev: (src, len = 20) => {
        const cacheKey = `bb_${len}_1`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcBollinger(candles, len, 1);
        const bb = indicatorCache[cacheKey];
        return bb.upper[targetIdx] && bb.middle[targetIdx] ? (bb.upper[targetIdx] - bb.middle[targetIdx]) : 0;
      },
      keltner_upper: (len = 20, mult = 1.5) => {
        const cacheKey = `kc_${len}_${mult}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcKeltner(candles, len, mult);
        return indicatorCache[cacheKey].upper[targetIdx] || c.high;
      },
      keltner_lower: (len = 20, mult = 1.5) => {
        const cacheKey = `kc_${len}_${mult}`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcKeltner(candles, len, mult);
        return indicatorCache[cacheKey].lower[targetIdx] || c.low;
      },
      keltner_middle: (len = 20) => {
        const cacheKey = `kc_${len}_1.5`;
        if (!indicatorCache[cacheKey]) indicatorCache[cacheKey] = calcKeltner(candles, len, 1.5);
        return indicatorCache[cacheKey].middle[targetIdx] || c.close;
      },
      squeeze_on: (bbLen = 20, bbMult = 2, kcLen = 20, kcMult = 1.5) => {
        const bbKey = `bb_${bbLen}_${bbMult}`;
        const kcKey = `kc_${kcLen}_${kcMult}`;
        if (!indicatorCache[bbKey]) indicatorCache[bbKey] = calcBollinger(candles, bbLen, bbMult);
        if (!indicatorCache[kcKey]) indicatorCache[kcKey] = calcKeltner(candles, kcLen, kcMult);
        const bb = indicatorCache[bbKey];
        const kc = indicatorCache[kcKey];
        return (bb.upper[targetIdx] < kc.upper[targetIdx]) && (bb.lower[targetIdx] > kc.lower[targetIdx]);
      },
      squeeze_fired: (bbLen = 20, bbMult = 2, kcLen = 20, kcMult = 1.5) => {
        const bbKey = `bb_${bbLen}_${bbMult}`;
        const kcKey = `kc_${kcLen}_${kcMult}`;
        if (!indicatorCache[bbKey]) indicatorCache[bbKey] = calcBollinger(candles, bbLen, bbMult);
        if (!indicatorCache[kcKey]) indicatorCache[kcKey] = calcKeltner(candles, kcLen, kcMult);
        const bb = indicatorCache[bbKey];
        const kc = indicatorCache[kcKey];
        return (bb.upper[targetIdx] >= kc.upper[targetIdx]) || (bb.lower[targetIdx] <= kc.lower[targetIdx]);
      },
      bb_lower_below_kc_lower: (bbLen = 20, bbMult = 2, kcLen = 20, kcMult = 1.5) => {
        const bbKey = `bb_${bbLen}_${bbMult}`;
        const kcKey = `kc_${kcLen}_${kcMult}`;
        if (!indicatorCache[bbKey]) indicatorCache[bbKey] = calcBollinger(candles, bbLen, bbMult);
        if (!indicatorCache[kcKey]) indicatorCache[kcKey] = calcKeltner(candles, kcLen, kcMult);
        return indicatorCache[bbKey].lower[targetIdx] < indicatorCache[kcKey].lower[targetIdx];
      },
      bb_lower_below_zero: (bbLen = 20, bbMult = 2) => {
        const bbKey = `bb_${bbLen}_${bbMult}`;
        if (!indicatorCache[bbKey]) indicatorCache[bbKey] = calcBollinger(candles, bbLen, bbMult);
        return indicatorCache[bbKey].percentB[targetIdx] < 0 || indicatorCache[bbKey].lower[targetIdx] < 0;
      },
      crossover: (val1, val2) => {
        // Approximate crossover using current vs previous
        return val1 > val2 && prevC.close <= val2;
      },
      crossunder: (val1, val2) => {
        return val1 < val2 && prevC.close >= val2;
      },
    },
  };
  
  try {
    // Transform python/pine 'and' / 'or' / 'not' to js '&&' / '||' / '!'
    let sanitized = expression
      .replace(/\band\b/gi, '&&')
      .replace(/\bor\b/gi, '||')
      .replace(/\bnot\b/gi, '!')
      .replace(/\btrue\b/gi, 'true')
      .replace(/\bfalse\b/gi, 'false');
    
    // Evaluate safely with context
    const evalFn = new Function('ctx', `
      with (ctx) {
        return Boolean(${sanitized});
      }
    `);
    
    const result = evalFn(context);
    return { result, error: null };
  } catch (err) {
    return { result: false, error: err.message };
  }
}

// ─── 10. Multi-Indicator Suite Generator ─────────────────────────────────────

/**
 * Computes all configured indicators for a candle series in one pass
 */
function computeIndicatorSuite(candles, options = {}) {
  const donchianPeriods = options.donchianPeriods || [10, 20, 55];
  const bbConfigs = options.bbConfigs || [{ period: 20, mult: 2.0 }, { period: 50, mult: 2.5 }];
  const rsiPeriods = options.rsiPeriods || [7, 14, 21];
  const emaPeriods = options.emaPeriods || [9, 21, 50, 200];
  const adxPeriod = options.adxPeriod || 14;
  const macdConfig = options.macdConfig || { fast: 12, slow: 26, signal: 9 };
  
  const closes = candles.map(c => c.close);
  
  const donchian = {};
  donchianPeriods.forEach(p => {
    donchian[`p${p}`] = calcDonchian(candles, p);
  });
  
  const bollinger = {};
  bbConfigs.forEach(({ period, mult }) => {
    bollinger[`bb_${period}_${mult}`] = calcBollinger(candles, period, mult);
  });
  
  const rsi = {};
  rsiPeriods.forEach(p => {
    rsi[`rsi_${p}`] = calcRSI(candles, p);
  });
  
  const emas = {};
  emaPeriods.forEach(p => {
    emas[`ema_${p}`] = ema(closes, p);
  });
  
  const adx = calcADX(candles, adxPeriod);
  const macd = calcMACD(candles, macdConfig.fast, macdConfig.slow, macdConfig.signal);
  const vwap = calcVWAP(candles);
  const volume = calcVolumeMetrics(candles, 20);
  const oi = analyzeOI(candles, options.optionData);
  const keltner = {
    standard: calcKeltner(candles, 20, 2.0, 10), // TradingView default (mult: 2.0, atr: 10)
    squeeze: calcKeltner(candles, 20, 1.5, 10),  // TTM Squeeze default (mult: 1.5, atr: 10)
    upper: null,
    lower: null,
    middle: null,
  };
  // Default points to standard TradingView (mult: 2.0)
  keltner.upper = keltner.standard.upper;
  keltner.lower = keltner.standard.lower;
  keltner.middle = keltner.standard.middle;
  
  return {
    donchian,
    bollinger,
    rsi,
    emas,
    adx,
    macd,
    vwap,
    volume,
    oi,
    keltner,
  };
}

module.exports = {
  sma,
  ema,
  calcATR,
  calcKeltner,
  calcDonchian,
  calcBollinger,
  calcRSI,
  calcADX,
  calcMACD,
  calcVWAP,
  calcVolumeMetrics,
  analyzeOI,
  evaluateCustomExpression,
  computeIndicatorSuite,
};

