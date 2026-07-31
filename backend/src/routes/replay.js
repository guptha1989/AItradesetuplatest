const express = require('express');
const router = express.Router();
const { replayEngine } = require('../utils/replayEngine');

// GET /api/replay/status — current replay status
router.get('/status', (req, res) => {
  res.json(replayEngine.getStatus());
});

// POST /api/replay/start — start or resume replay
router.post('/start', (req, res) => {
  const { speed } = req.body;
  if (speed) replayEngine.setSpeed(parseInt(speed));
  replayEngine.start();
  res.json(replayEngine.getStatus());
});

// POST /api/replay/pause — pause replay
router.post('/pause', (req, res) => {
  replayEngine.pause();
  res.json(replayEngine.getStatus());
});

// POST /api/replay/speed — update speed
router.post('/speed', (req, res) => {
  const { speed = 10 } = req.body;
  replayEngine.setSpeed(parseInt(speed));
  res.json(replayEngine.getStatus());
});

// POST /api/replay/seek — jump to minute (0 to 375)
router.post('/seek', (req, res) => {
  const { minute = 0 } = req.body;
  replayEngine.seek(parseInt(minute));
  res.json(replayEngine.getStatus());
});

// POST /api/replay/reset — reset replay to 09:15
router.post('/reset', (req, res) => {
  replayEngine.reset();
  res.json(replayEngine.getStatus());
});

// POST /api/replay/step — step forward 1 minute
router.post('/step', async (req, res) => {
  await replayEngine.step();
  res.json(replayEngine.getStatus());
});

module.exports = router;
