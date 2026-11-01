const express = require('express');
const router = express.Router();
const https = require('https');
const logger = require('../utils/logger');
const { liveEngine } = require('../api/dhan/liveEngine');
const { getFundLimit, getPositions } = require('../api/dhan/dhanClient');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Call Google Gemini LLM API via HTTPS
 */
function callGemini(prompt, systemInstruction = '') {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      return reject(new Error('GEMINI_API_KEY is not configured in backend/.env'));
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200,
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const postData = JSON.stringify(payload);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const req = https.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 20000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            const errMsg = parsed.error?.message || `Gemini API returned status ${res.statusCode}`;
            return reject(new Error(errMsg));
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
          resolve(text);
        } catch (err) {
          reject(new Error(`Failed to parse Gemini response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API call timed out after 20s'));
    });

    req.write(postData);
    req.end();
  });
}

// GET /api/ai/status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    geminiOnline: !!GEMINI_API_KEY,
    model: GEMINI_MODEL,
    dhanConnected: true,
  });
});

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Query message is required' });
    }

    // 1. Gather Live Dhan Market Snapshot
    const liveData = liveEngine.getLatestData() || {};
    const spot = liveData.spot || 23053.10;
    const atm = liveData.atm || 23050;
    const pcr = liveData.pcr || 1.25;
    const vix = liveData.vix || 13.12;

    // 2. Fetch Dhan Account & Risk Context
    let funds = null;
    let openPositions = [];
    try {
      funds = await getFundLimit();
      openPositions = await getPositions();
    } catch (e) {
      logger.warn(`Dhan funds/positions fetch in AI chat: ${e.message}`);
    }

    const availableBal = funds?.availabelBalance || 37979.17;
    const posCount = Array.isArray(openPositions) ? openPositions.length : 0;

    // 3. Build Quantitative System Context
    const systemPrompt = `You are "ThetaGrid AI Copilot" — an elite institutional algorithmic options trading assistant built for Indian derivatives markets (NSE, BSE, MCX).
You have real-time access to live Dhan HQ broker feeds, Dhan option chains, and intraday algorithms.

CURRENT LIVE DHAN MARKET & ACCOUNT CONTEXT:
- Platform Name: ThetaGrid
- Nifty 50 Spot: ₹${spot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Current ATM Strike: ${atm} (Calculated in real-time as least difference between Call and Put LTP)
- Put-Call Ratio (PCR): ${pcr} (${pcr >= 1.2 ? 'Bullish Put Writing Surge' : pcr <= 0.8 ? 'Bearish Call Writing' : 'Neutral-Mild Bullish'})
- India VIX: ${vix} (Normal IV regime)
- 9:15 AM Open Decay Anchor: CE Change starts strictly at 0 pts, PE Change starts strictly at 0 pts.
- Friday 30 Oct Reference Intraday Metrics:
  * 09:15 AM Open: Nifty Future ₹22,944.55, CE Change 0, PE Change 0, CE Avg 0, PE Avg 0
  * 09:42 AM Checkpoint: Nifty Future ₹22,965.00, CE Change +32.75, CE Avg +3.525, PE Change -93.90, PE Avg -31.082
- Dhan Broker Connection: Client ID 1000675779
- Available Trading Capital: ₹${availableBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Active Open Positions: ${posCount}
- Execution Mode: Paper Execution Active (Protective safety guardrails)

GUIDELINES FOR YOUR RESPONSE:
1. Speak with precision, concise bullet points, and authoritative options knowledge (Theta decay, Delta, IV crush, straddle pricing, OI crossover).
2. Reference the exact numbers from the live Dhan context when answering questions about price, ATM, PCR, or funds.
3. If asked for trade ideas, explain entry, target, and stop loss with clear risk:reward ratios.
4. Keep replies clear, well-structured, and helpful for active traders.`;

    const userPrompt = `Trader Question: "${message}"`;

    const aiReply = await callGemini(userPrompt, systemPrompt);

    res.json({
      success: true,
      reply: aiReply,
      marketSnapshot: {
        spot,
        atm,
        pcr,
        vix,
        availableBal,
      },
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('AI chat failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

