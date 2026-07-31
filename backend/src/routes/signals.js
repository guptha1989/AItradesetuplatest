const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateSignal } = require('../api/gemini/signalAnalyzer');
const logger = require('../utils/logger');

// GET /api/signals — list recent signals
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || null;
    let sql = `SELECT * FROM signals ORDER BY generated_at DESC LIMIT ?`;
    let params = [limit];
    if (status) {
      sql = `SELECT * FROM signals WHERE status = ? ORDER BY generated_at DESC LIMIT ?`;
      params = [status, limit];
    }
    const signals = await query(sql, params);
    res.json({ signals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/signals/:id — get signal detail
router.get('/:id', async (req, res) => {
  try {
    const [signal] = await query(`SELECT * FROM signals WHERE id = ?`, [req.params.id]);
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    res.json({ signal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/signals/generate — manually trigger Gemini signal
router.post('/generate', async (req, res) => {
  try {
    const marketData = req.body; // Expect market data in request body
    if (!marketData.spot) {
      return res.status(400).json({ error: 'spot price is required in request body' });
    }
    const signal = await generateSignal(marketData);
    if (!signal) {
      return res.json({ message: 'No signal generated (outside market hours or below confidence threshold)' });
    }
    res.json({ signal });
  } catch (err) {
    logger.error('Manual signal generation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/signals/:id/status — update signal status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, rejectedReason } = req.body;
    const validStatuses = ['PENDING', 'EXECUTED', 'REJECTED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    await query(
      `UPDATE signals SET status = ?, rejected_reason = ?, executed_at = IF(? = 'EXECUTED', NOW(), executed_at) WHERE id = ?`,
      [status, rejectedReason || null, status, req.params.id]
    );
    res.json({ success: true, signalId: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
