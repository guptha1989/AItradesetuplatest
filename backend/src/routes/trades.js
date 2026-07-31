const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { getPositions } = require('../api/dhan/dhanClient');
const logger = require('../utils/logger');

/**
 * Fetch Dhan positions and transform them into Trade Journal records.
 */
async function getDhanLiveTrades() {
  try {
    const rawPos = await getPositions();
    const positions = Array.isArray(rawPos) ? rawPos : (rawPos?.data || []);

    return positions.map((p, idx) => {
      const pnl = p.realizedProfit || 0;
      const charges = Math.abs(pnl) * 0.002;
      const qty = p.dayBuyQty || p.buyQty || p.daySellQty || 25;
      const lots = Math.max(1, Math.round(qty / 25));

      return {
        id: `DHAN_${p.securityId || idx}`,
        symbol: p.tradingSymbol,
        strike: p.drvStrikePrice,
        type: p.drvOptionType === 'CALL' ? 'CE' : p.drvOptionType === 'PUT' ? 'PE' : 'EQ',
        action: p.dayBuyQty >= p.daySellQty ? 'BUY' : 'SELL',
        lots,
        qty,
        entry_price: p.buyAvg || p.costPrice,
        exit_price: p.sellAvg || p.costPrice,
        entry_time: p.drvExpiryDate || new Date().toISOString(),
        exit_time: p.positionType === 'CLOSED' ? new Date().toISOString() : null,
        status: p.positionType || (p.netQty === 0 ? 'CLOSED' : 'OPEN'),
        pnl,
        net_pnl: pnl - charges,
        strategy: 'Dhan Live Trade',
      };
    });
  } catch (err) {
    logger.warn('Dhan live trades fetch warning:', err.message);
    return [];
  }
}

// GET /api/trades — list trades
router.get('/', async (req, res) => {
  try {
    const { status, date, limit = 100 } = req.query;
    
    // Fetch DB trades
    let dbTrades = [];
    try {
      let sql = `SELECT t.*, s.strategy, s.direction, s.confidence 
                 FROM trades t LEFT JOIN signals s ON t.signal_id = s.id
                 WHERE 1=1`;
      const params = [];
      if (status) { sql += ' AND t.status = ?'; params.push(status); }
      if (date) { sql += ' AND DATE(t.entry_time) = ?'; params.push(date); }
      sql += ' ORDER BY t.entry_time DESC LIMIT ?';
      params.push(parseInt(limit));
      dbTrades = await query(sql, params);
    } catch (e) {
      logger.warn('DB trades fetch warning:', e.message);
    }

    // Fetch Dhan live trades
    const dhanTrades = await getDhanLiveTrades();

    // Merge without duplicates
    const dbIds = new Set(dbTrades.map(t => t.id));
    const merged = [...dhanTrades.filter(t => !dbIds.has(t.id)), ...dbTrades];

    res.json({ trades: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades/pnl — P&L summary
router.get('/pnl', async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().split('T')[0];
    
    const dhanTrades = await getDhanLiveTrades();
    
    let totalTrades = dhanTrades.length;
    let closedTrades = dhanTrades.filter(t => t.status === 'CLOSED').length;
    let openTrades = dhanTrades.filter(t => t.status === 'OPEN').length;
    let winningTrades = dhanTrades.filter(t => t.status === 'CLOSED' && t.pnl > 0).length;
    let losingTrades = dhanTrades.filter(t => t.status === 'CLOSED' && t.pnl <= 0).length;
    let realizedPnl = dhanTrades.filter(t => t.status === 'CLOSED').reduce((sum, t) => sum + (t.pnl || 0), 0);
    let netPnl = dhanTrades.filter(t => t.status === 'CLOSED').reduce((sum, t) => sum + (t.net_pnl || 0), 0);

    const pnls = dhanTrades.map(t => t.pnl || 0);
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

    res.json({
      date: today,
      summary: {
        totalTrades,
        closedTrades,
        openTrades,
        winningTrades,
        losingTrades,
        realizedPnl,
        netPnl,
        bestTrade,
        worstTrade,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades/monthly — monthly view with daily breakdown
router.get('/monthly', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const dhanTrades = await getDhanLiveTrades();

    const todayStr = new Date().toISOString().split('T')[0];
    const winningTrades = dhanTrades.filter(t => t.status === 'CLOSED' && t.pnl > 0).length;
    const losingTrades = dhanTrades.filter(t => t.status === 'CLOSED' && t.pnl <= 0).length;
    const netPnl = dhanTrades.reduce((s, t) => s + (t.net_pnl || 0), 0);

    const dailyHistory = [
      {
        trade_date: todayStr,
        total_trades: dhanTrades.length,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        gross_pnl: dhanTrades.reduce((s, t) => s + (t.pnl || 0), 0),
        net_pnl: netPnl,
      },
    ];

    res.json({
      month,
      dailyHistory,
      trades: dhanTrades,
      summary: {
        totalTrades: dhanTrades.length,
        closedTrades: dhanTrades.filter(t => t.status === 'CLOSED').length,
        openTrades: dhanTrades.filter(t => t.status === 'OPEN').length,
        winningTrades,
        losingTrades,
        realizedPnl: dhanTrades.reduce((s, t) => s + (t.pnl || 0), 0),
        netPnl,
        bestTrade: Math.max(...dhanTrades.map(t => t.pnl || 0), 0),
        worstTrade: Math.min(...dhanTrades.map(t => t.pnl || 0), 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
