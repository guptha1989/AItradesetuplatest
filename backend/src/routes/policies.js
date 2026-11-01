const express = require('express');
const router = express.Router();
const { policyEngine } = require('../api/policyEngine');
const logger = require('../utils/logger');

// ─── Policies CRUD ────────────────────────────────────────────────────────────

// Get all policies
router.get('/', (req, res) => {
  try {
    const list = policyEngine.getPolicies();
    res.json({ success: true, count: list.length, policies: list });
  } catch (err) {
    logger.error('Error fetching policies:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or Update a policy
router.post('/', (req, res) => {
  try {
    const policyData = req.body;
    if (!policyData || !policyData.name) {
      return res.status(400).json({ success: false, error: 'Policy name is required' });
    }
    const saved = policyEngine.savePolicy(policyData);
    res.json({ success: true, policy: saved });
  } catch (err) {
    logger.error('Error saving policy:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a policy
router.delete('/:id', (req, res) => {
  try {
    const deleted = policyEngine.deletePolicy(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    res.json({ success: true, message: 'Policy deleted successfully' });
  } catch (err) {
    logger.error('Error deleting policy:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Backtesting ──────────────────────────────────────────────────────────────

router.post('/backtest', async (req, res) => {
  try {
    const { policy, symbol, fromDate, toDate, initialCapital, timeframe, lotSize } = req.body;
    if (!policy) {
      return res.status(400).json({ success: false, error: 'Policy configuration is required' });
    }

    const backtestResult = await policyEngine.runBacktest({
      policy,
      symbol: symbol || policy.symbol || 'NIFTY',
      fromDate: fromDate || '2026-07-01',
      toDate: toDate || '2026-07-31',
      initialCapital: Number(initialCapital) || 100000,
      timeframe: timeframe || policy.timeframe || '5m',
      lotSize: Number(lotSize) || 25,
    });

    res.json({ success: true, ...backtestResult });
  } catch (err) {
    logger.error('Backtest execution error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Alerts Endpoints ─────────────────────────────────────────────────────────

// Get active and historical alerts (supports up to 6 months)
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 500;
    const months = req.query.months !== undefined ? parseInt(req.query.months, 10) : 6;
    const alerts = policyEngine.getAlerts(limit, months);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear all alerts
router.post('/alerts/clear', (req, res) => {
  try {
    policyEngine.clearAlerts();
    res.json({ success: true, message: 'All alerts cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Acknowledge an alert
router.post('/alerts/:id/ack', (req, res) => {
  try {
    const acked = policyEngine.acknowledgeAlert(req.params.id);
    if (!acked) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    res.json({ success: true, alert: acked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── TradingView Webhook Receiver ─────────────────────────────────────────────

router.post('/webhook', (req, res) => {
  try {
    const payload = req.body;
    logger.info('Received TradingView webhook:', payload);

    const {
      secret,
      ticker,
      symbol,
      action,
      type,
      price,
      policyName,
      message,
    } = payload;

    const alertType = (action || type || 'ENTRY_LONG').toUpperCase().includes('SELL') ||
      (action || type || '').toUpperCase().includes('SHORT')
        ? 'ENTRY_SHORT'
        : (action || type || '').toUpperCase().includes('EXIT')
        ? 'EXIT_LONG'
        : 'ENTRY_LONG';

    const dispatched = policyEngine.dispatchAlert({
      policyId: 'webhook_tv',
      policyName: policyName || 'TradingView Webhook Strategy',
      type: alertType,
      timeframe: payload.timeframe || payload.interval || '5m',
      symbol: symbol || ticker || 'NIFTY',
      price: price || 0,
      pointsCaptured: payload.points !== undefined ? payload.points : payload.pointsCaptured,
      maxDrawdown: payload.maxDrawdown,
      reasons: [message || `TradingView webhook alert: ${action || 'TRIGGER'}`],
      source: 'TV_WEBHOOK',
      metadata: payload,
    });

    res.json({
      success: true,
      message: 'TradingView webhook processed successfully',
      alert: dispatched,
    });
  } catch (err) {
    logger.error('Error processing TradingView webhook:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

