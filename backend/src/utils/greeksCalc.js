/**
 * Black-Scholes Greeks Calculator for Nifty Options
 * Fast, local, no external dependency — runs on every tick if needed.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function normCDF(x) {
  // Abramowitz and Stegun approximation (error < 7.5e-8)
  const a1 = 0.319381530, a2 = -0.356563782, a3 = 1.781477937;
  const a4 = -1.821255978, a5 = 1.330274429;
  const k = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const poly = k * (a1 + k * (a2 + k * (a3 + k * (a4 + k * a5))));
  const result = 1.0 - (1.0 / SQRT_2PI) * Math.exp(-0.5 * x * x) * poly;
  return x >= 0 ? result : 1.0 - result;
}

function normPDF(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Calculate d1 and d2 for Black-Scholes.
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry in years (trading days / 252)
 * @param {number} r - Risk-free rate (decimal, e.g., 0.065 for 6.5%)
 * @param {number} v - Implied Volatility (decimal, e.g., 0.15 for 15%)
 */
function d1d2(S, K, T, r, v) {
  const d1 = (Math.log(S / K) + (r + 0.5 * v * v) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  return { d1, d2 };
}

/**
 * Calculate all Greeks for an option.
 * @param {object} params
 * @param {number} params.spot - Current Nifty index level
 * @param {number} params.strike - Option strike price
 * @param {number} params.tte - Trading days to expiry
 * @param {number} params.iv - Implied volatility (percentage, e.g., 15.5)
 * @param {string} params.type - 'CE' or 'PE'
 * @param {number} [params.riskFreeRate=0.065] - Risk-free rate
 * @returns {object} Greeks and theoretical price
 */
function calcGreeks({ spot, strike, tte, iv, type, riskFreeRate = 0.065 }) {
  const S = spot;
  const K = strike;
  const T = Math.max(tte / 252, 1e-6); // years, avoid division by zero
  const r = riskFreeRate;
  const v = iv / 100; // percentage → decimal

  if (v <= 0 || S <= 0 || K <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, theoreticalPrice: 0, iv };
  }

  const { d1, d2 } = d1d2(S, K, T, r, v);
  const Nd1 = normCDF(d1);
  const Nd2 = normCDF(d2);
  const nPDFd1 = normPDF(d1);
  const sqrtT = Math.sqrt(T);
  const eRtT = Math.exp(-r * T);

  let theoreticalPrice, delta, theta;

  if (type === 'CE') {
    theoreticalPrice = S * Nd1 - K * eRtT * Nd2;
    delta = Nd1;
    theta = (
      -(S * nPDFd1 * v) / (2 * sqrtT) -
      r * K * eRtT * Nd2
    ) / 365;
  } else {
    theoreticalPrice = K * eRtT * (1 - Nd2) - S * (1 - Nd1);
    delta = Nd1 - 1;
    theta = (
      -(S * nPDFd1 * v) / (2 * sqrtT) +
      r * K * eRtT * (1 - Nd2)
    ) / 365;
  }

  const gamma = nPDFd1 / (S * v * sqrtT);
  const vega = (S * nPDFd1 * sqrtT) / 100; // per 1% change in IV

  return {
    theoreticalPrice: Math.max(0, theoreticalPrice),
    delta: parseFloat(delta.toFixed(4)),
    gamma: parseFloat(gamma.toFixed(6)),
    theta: parseFloat(theta.toFixed(4)),
    vega: parseFloat(vega.toFixed(4)),
    iv,
  };
}

/**
 * Calculate PCR (Put-Call Ratio) from option chain data.
 * @param {Array} chain - Array of { type, oi }
 */
function calcPCR(chain) {
  let totalPutOI = 0, totalCallOI = 0;
  chain.forEach(({ type, oi }) => {
    if (type === 'PE') totalPutOI += oi;
    else if (type === 'CE') totalCallOI += oi;
  });
  const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
  return parseFloat(pcr.toFixed(3));
}

/**
 * Find ATM strike given spot price and available strikes.
 * @param {number} spot
 * @param {Array<number>} strikes
 */
function findATMStrike(spot, strikes) {
  return strikes.reduce((prev, curr) =>
    Math.abs(curr - spot) < Math.abs(prev - spot) ? curr : prev
  );
}

/**
 * Calculate IV rank (current IV vs 52-week range).
 * @param {number} currentIV
 * @param {number} yearHighIV
 * @param {number} yearLowIV
 */
function calcIVRank(currentIV, yearHighIV, yearLowIV) {
  if (yearHighIV === yearLowIV) return 50;
  return parseFloat(((currentIV - yearLowIV) / (yearHighIV - yearLowIV) * 100).toFixed(1));
}

module.exports = { calcGreeks, calcPCR, findATMStrike, calcIVRank, normCDF };
