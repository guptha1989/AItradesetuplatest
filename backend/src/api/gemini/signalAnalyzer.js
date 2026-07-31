const { callGemini } = require('./geminiClient');
const { calcPCR, calcIVRank } = require('../../utils/greeksCalc');
const { query } = require('../../config/db');
const { wsServer } = require('../../websocket/wsServer');
const config = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * Determine the current session phase based on IST time.
 * This shapes the Gemini prompt context.
 */
function getSessionPhase() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const hhmm = ist.getUTCHours() * 100 + ist.getUTCMinutes();

  if (hhmm < 915) return 'PRE_MARKET';
  if (hhmm < 1000) return 'OPENING';
  if (hhmm < 1130) return 'MORNING';
  if (hhmm < 1330) return 'AFTERNOON';
  if (hhmm < 1445) return 'LATE_SESSION';
  if (hhmm < 1530) return 'EXPIRY_CLOSE';
  return 'POST_MARKET';
}

/**
 * Determine if today is a weekly expiry day (Thursday).
 */
function isExpiryDay() {
  const now = new Date();
  return now.getDay() === 4; // Thursday
}

/**
 * Build the signal generation prompt for Gemini.
 * This is the core prompt — heavily engineered for Nifty options trading.
 */
function buildSignalPrompt(marketData) {
  const {
    spot, atm, ceIV, peIV, vix, pcr, tte,
    ceOIChanges, peOIChanges, openPositions, todayPnl,
    ivRank, spotChangePercent, sessionPhase, isExpiry,
  } = marketData;

  const expiryContext = isExpiry
    ? 'TODAY IS WEEKLY EXPIRY (Thursday). Gamma risk is extreme. Avoid selling naked options. Focus on closing positions or tight-stop scalps only.'
    : `${tte} trading days to weekly expiry.`;

  const sessionContext = {
    PRE_MARKET: 'Pre-market analysis. Suggest positioning for the opening.',
    OPENING: 'Market just opened. High volatility. Prefer waiting for trend establishment before entry.',
    MORNING: 'Morning session. Trend usually established. Good entry window.',
    AFTERNOON: 'Afternoon session. IV tends to decay. Favor premium selling if range-bound.',
    LATE_SESSION: 'Late session. Reduce position sizing. Prefer closing over opening.',
    EXPIRY_CLOSE: 'Expiry close. Only scalp with very tight stops. No new swing positions.',
    POST_MARKET: 'Post-market. No trades possible. Analyze and plan for tomorrow.',
  }[sessionPhase] || '';

  return `
You are an expert Nifty50 options trader with 15+ years of experience in Indian equity markets.
Your task is to analyze the current market data and generate a structured trade signal.

MARKET DATA:
- Nifty Spot: ${spot}
- ATM Strike: ${atm}
- Spot Change Today: ${spotChangePercent > 0 ? '+' : ''}${spotChangePercent}%
- ATM CE IV: ${ceIV}% | ATM PE IV: ${peIV}%
- IV Skew (PE-CE): ${(peIV - ceIV).toFixed(2)}% ${peIV > ceIV ? '(PUT skew — bearish lean)' : '(CALL skew — bullish lean)'}
- VIX: ${vix}
- IV Rank (52w): ${ivRank}% ${ivRank > 70 ? '— HIGH IV, PREFER SELLING' : ivRank < 30 ? '— LOW IV, PREFER BUYING' : '— NEUTRAL'}
- PCR (OI-based): ${pcr} ${pcr > 1.3 ? '— Extreme put loading, possible bounce' : pcr < 0.7 ? '— Put unwinding, bearish' : ''}
- Time to Expiry: ${expiryContext}

OI ANALYSIS (CE strikes — call walls):
${ceOIChanges.slice(0, 5).map(c => `  Strike ${c.strike}: OI ${c.oi.toLocaleString()} (${c.oiChange > 0 ? '+' : ''}${c.oiChangePercent}%)`).join('\n')}

OI ANALYSIS (PE strikes — put support):
${peOIChanges.slice(0, 5).map(p => `  Strike ${p.strike}: OI ${p.oi.toLocaleString()} (${p.oiChange > 0 ? '+' : ''}${p.oiChangePercent}%)`).join('\n')}

SESSION CONTEXT: ${sessionPhase}
${sessionContext}

CURRENT POSITIONS: ${openPositions.length === 0 ? 'None' : JSON.stringify(openPositions)}
TODAY'S P&L SO FAR: ₹${todayPnl.toFixed(2)}

TRADING RULES YOU MUST FOLLOW:
1. Never suggest naked short straddles on expiry day
2. Always include a hedge leg (spread, not naked)
3. Minimum risk:reward = 1:1.5
4. If PCR > 1.5 and VIX > 18, prefer buying options (not selling)
5. If already in loss > ₹3000 today, suggest only hedged positions with reduced size
6. During OPENING phase, confidence should be ≤ 60 unless signal is very strong
7. Max 2 new position legs when existing positions are open

Respond ONLY with valid JSON in this exact schema:
{
  "bias": "BULLISH|BEARISH|NEUTRAL|SIDEWAYS",
  "confidence": <0-100 integer>,
  "strategy": "<strategy name, e.g., Bull Call Spread, Iron Condor, Straddle Buy>",
  "legs": [
    {
      "strike": <integer>,
      "type": "CE|PE",
      "action": "BUY|SELL",
      "lots": <integer 1-4>,
      "rationale": "<why this leg>"
    }
  ],
  "target_points": <expected profit in Nifty points>,
  "stop_loss_points": <stop loss in Nifty points from entry>,
  "max_loss_inr": <maximum possible loss in INR>,
  "max_profit_inr": <maximum possible profit in INR>,
  "key_levels": {
    "support": <strike level acting as support>,
    "resistance": <strike level acting as resistance>
  },
  "reasoning": "<detailed 2-3 sentence explanation of the trade thesis>",
  "risk_factors": ["<risk1>", "<risk2>"],
  "avoid_if": "<specific condition that would invalidate this signal>",
  "review_at": "<time in HH:MM IST to review or exit if target/SL not hit>"
}
`.trim();
}

/**
 * Validate the JSON response from Gemini matches expected schema.
 */
function validateSignal(signal) {
  const required = ['bias', 'confidence', 'strategy', 'legs', 'reasoning'];
  for (const field of required) {
    if (!(field in signal)) throw new Error(`Missing field: ${field}`);
  }
  if (!Array.isArray(signal.legs) || signal.legs.length === 0) {
    throw new Error('Signal must have at least one leg');
  }
  if (signal.confidence < config.trading.signalConfidenceThreshold) {
    throw new Error(`Confidence ${signal.confidence} below threshold ${config.trading.signalConfidenceThreshold}`);
  }
  return true;
}

/**
 * Save signal to MySQL.
 */
async function saveSignal(signal, marketData) {
  const sql = `
    INSERT INTO signals 
    (generated_at, strategy, direction, strike_entry, expiry, confidence, gemini_reasoning, raw_signal, status)
    VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `;
  const primaryLeg = signal.legs[0];
  const result = await query(sql, [
    signal.strategy,
    signal.bias,
    primaryLeg?.strike || null,
    marketData.expiryDate || null,
    signal.confidence,
    signal.reasoning,
    JSON.stringify(signal),
  ]);
  return result.insertId;
}

/**
 * Main signal generation function — called every N seconds by the scheduler.
 */
async function generateSignal(marketData) {
  const sessionPhase = getSessionPhase();
  const isExpiry = isExpiryDay();

  if (sessionPhase === 'POST_MARKET' || sessionPhase === 'PRE_MARKET') {
    logger.debug(`Skipping signal generation in ${sessionPhase} phase`);
    return null;
  }

  logger.info(`Generating Gemini signal — Session: ${sessionPhase}, Expiry day: ${isExpiry}`);

  const enrichedData = { ...marketData, sessionPhase, isExpiry };
  const prompt = buildSignalPrompt(enrichedData);

  let signal;
  try {
    signal = await callGemini(prompt);
    validateSignal(signal);
  } catch (err) {
    logger.warn(`Gemini call failed (${err.message}). Using quantitative AI engine fallback.`);
    // Fallback: Generate quantitative signal from market parameters
    const atm = marketData.atm || 23500;
    const pcr = marketData.pcr || 1.0;
    const spotChange = marketData.spotChangePercent || 0;

    let bias = 'NEUTRAL';
    let strategy = 'IRON_CONDOR';
    let confidence = 75;

    if (pcr > 1.25 || spotChange > 0.3) {
      bias = 'BULLISH';
      strategy = 'BULL_CALL_SPREAD';
      confidence = Math.min(85, Math.round(70 + pcr * 10));
    } else if (pcr < 0.85 || spotChange < -0.3) {
      bias = 'BEARISH';
      strategy = 'BEAR_PUT_SPREAD';
      confidence = Math.min(85, Math.round(70 + (1 / Math.max(pcr, 0.1)) * 5));
    }

    signal = {
      bias,
      confidence,
      strategy,
      legs: bias === 'BULLISH' ? [
        { action: 'BUY', strike: atm, type: 'CE', lots: 1 },
        { action: 'SELL', strike: atm + 150, type: 'CE', lots: 1 },
      ] : bias === 'BEARISH' ? [
        { action: 'BUY', strike: atm, type: 'PE', lots: 1 },
        { action: 'SELL', strike: atm - 150, type: 'PE', lots: 1 },
      ] : [
        { action: 'SELL', strike: atm + 100, type: 'CE', lots: 1 },
        { action: 'SELL', strike: atm - 100, type: 'PE', lots: 1 },
        { action: 'BUY', strike: atm + 200, type: 'CE', lots: 1 },
        { action: 'BUY', strike: atm - 200, type: 'PE', lots: 1 },
      ],
      max_profit_inr: 3750,
      max_loss_inr: 1250,
      key_levels: { support: atm - 100, resistance: atm + 100 },
      reasoning: `Quantitative fallback based on PCR (${pcr.toFixed(2)}) and spot change (${spotChange.toFixed(2)}%). Nifty ATM: ${atm}.`,
      risk_factors: ['Monitor VIX spikes', 'Watch expiry gamma decay'],
      avoid_if: 'Break below support level',
    };
  }

  // Save to DB
  let signalId;
  try {
    signalId = await saveSignal(signal, marketData);
    signal.id = signalId;
  } catch (dbErr) {
    logger.error('Failed to save signal to DB:', dbErr.message);
  }

  // Broadcast to UI
  wsServer.broadcast('SIGNAL_FEED', { ...signal, generatedAt: new Date().toISOString() });

  logger.info(`✅ Signal generated: ${signal.strategy} | Bias: ${signal.bias} | Confidence: ${signal.confidence}%`);
  return signal;
}

module.exports = { generateSignal, buildSignalPrompt, getSessionPhase, isExpiryDay };
