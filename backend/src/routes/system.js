const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { riskManager } = require('../oms/riskManager');
const { wsServer } = require('../websocket/wsServer');
const config = require('../config/env');
const logger = require('../utils/logger');

// GET /api/system/status
router.get('/status', (req, res) => {
  res.json({
    paperMode: config.trading.paperMode,
    risk: riskManager.getStatus(),
    ws: wsServer.getStats(),
    serverTime: new Date().toISOString(),
  });
});

// POST /api/system/toggle-paper-mode
router.post('/toggle-paper-mode', (req, res) => {
  // Toggle paper mode at runtime (restart required for persistence)
  const current = config.trading.paperMode;
  config.trading.paperMode = !current;
  const mode = config.trading.paperMode ? 'PAPER' : 'LIVE';
  logger.warn(`Trading mode switched to: ${mode}`);
  wsServer.broadcast('STATUS_FEED', { type: 'MODE_CHANGED', mode });
  res.json({ success: true, paperMode: config.trading.paperMode, mode });
});

// POST /api/system/resume-trading
router.post('/resume-trading', (req, res) => {
  riskManager.resumeTrading();
  res.json({ success: true, status: riskManager.getStatus() });
});

// GET /api/system/logs
router.get('/logs', async (req, res) => {
  try {
    const events = await query(
      `SELECT * FROM system_events ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
