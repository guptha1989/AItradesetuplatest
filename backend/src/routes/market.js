const express = require('express');
const router = express.Router();
const { getLTP, getPositions, getFundLimits } = require('../api/dhan/dhanClient');
const logger = require('../utils/logger');

// GET /api/market/ltp
router.get('/ltp', async (req, res) => {
  try {
    const instruments = req.body?.instruments || [];
    if (instruments.length === 0) {
      return res.status(400).json({ error: 'instruments array required in body' });
    }
    const data = await getLTP(instruments);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/positions — live positions from Dhan
router.get('/positions', async (req, res) => {
  try {
    const rawPositions = await getPositions();
    const positions = Array.isArray(rawPositions) ? rawPositions : (rawPositions.data || []);
    
    // Transform positions
    const formatted = positions.map(p => ({
      id: p.securityId,
      symbol: p.tradingSymbol,
      strike: p.drvStrikePrice,
      type: p.drvOptionType === 'CALL' ? 'CE' : p.drvOptionType === 'PUT' ? 'PE' : 'EQ',
      buyQty: p.buyQty,
      sellQty: p.sellQty,
      netQty: p.netQty,
      costPrice: p.costPrice || p.buyAvg,
      sellAvg: p.sellAvg,
      realizedProfit: p.realizedProfit || 0,
      unrealizedProfit: p.unrealizedProfit || 0,
      status: p.positionType || (p.netQty !== 0 ? 'OPEN' : 'CLOSED'),
      expiry: p.drvExpiryDate,
    }));

    res.json({ positions: formatted, raw: positions });
  } catch (err) {
    logger.error('Fetch live positions failed:', err.message);
    res.status(500).json({ error: err.message, positions: [] });
  }
});

// GET /api/market/funds — live fund limits from Dhan
router.get('/funds', async (req, res) => {
  try {
    const rawFunds = await getFundLimits();
    const funds = rawFunds.data || rawFunds;
    res.json({
      availableBalance: funds.availabelBalance || funds.availableBalance || 0,
      sodLimit: funds.sodLimit || 0,
      utilizedAmount: funds.utilizedAmount || 0,
      withdrawableBalance: funds.withdrawableBalance || 0,
      raw: funds,
    });
  } catch (err) {
    logger.error('Fetch live funds failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
