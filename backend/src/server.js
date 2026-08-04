const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

require('dotenv').config();

const config = require('./config/env');
const { testConnection } = require('./config/db');
const logger = require('./utils/logger');
const { wsServer } = require('./websocket/wsServer');
const { dhanWS } = require('./api/dhan/dhanWS');
const { liveEngine } = require('./api/dhan/liveEngine');
const { riskManager } = require('./oms/riskManager');
const { generateSignal } = require('./api/gemini/signalAnalyzer');
const { getNextWeeklyExpiry } = require('./api/dhan/dhanClient');

// ─── Route Imports ────────────────────────────────────────────
const marketRoutes = require('./routes/market');
const signalRoutes = require('./routes/signals');
const tradeRoutes = require('./routes/trades');
const systemRoutes = require('./routes/system');
const optionChainRoutes = require('./routes/optionChain');
const srRoutes = require('./routes/sr');
const trendingOIRoutes = require('./routes/trendingOI');
const replayRoutes = require('./routes/replay');
const historicalRoutes = require('./routes/historical');

// ─── App Setup ───────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// ─── REST Routes ─────────────────────────────────────────────
app.use('/api/market', marketRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/chain', optionChainRoutes);
app.use('/api/sr', srRoutes);
app.use('/api/trending-oi', trendingOIRoutes);
app.use('/api/replay', replayRoutes);
app.use('/api/historical', historicalRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Nifty Options AI Trading Platform API',
    status: 'online',
    version: '1.0.0',
    mode: config.trading.paperMode ? 'PAPER TRADING' : 'LIVE TRADING',
    dhanConnected: !!(config.dhan.clientId && config.dhan.accessToken),
    endpoints: {
      health: '/health',
      optionChain: '/api/chain',
      signals: '/api/signals',
      trades: '/api/trades',
      trendingOI: '/api/trending-oi',
      supportResistance: '/api/sr',
      replay: '/api/replay',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    paperMode: config.trading.paperMode,
    wsClients: wsServer.getStats().connectedClients,
    dhanWS: dhanWS.getStatus(),
    risk: riskManager.getStatus(),
  });
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ─── WebSocket Server ─────────────────────────────────────────
wsServer.attach(httpServer);

// ─── Scheduled Jobs ──────────────────────────────────────────
let marketDataCache = {}; // Shared state for scheduled jobs

/**
 * Every 30 seconds: Collect market data and trigger Gemini signal
 */
cron.schedule(`*/${config.trading.geminiSignalIntervalSec / 60} * * * *`, async () => {
  if (!marketDataCache.spot) return; // No data yet
  try {
    await generateSignal(marketDataCache);
  } catch (err) {
    logger.error('Scheduled signal generation failed:', err.message);
  }
});

/**
 * Every minute: Sync positions and P&L from Dhan
 */
cron.schedule('* * * * *', async () => {
  try {
    await riskManager.sync();
    wsServer.broadcast('PNL_FEED', { type: 'RISK_STATUS', data: riskManager.getStatus() });
  } catch (err) {
    logger.error('Scheduled risk sync failed:', err.message);
  }
});

/**
 * 09:17 AM IST daily: Capture & lock 09:17 AM Day Open prices for Spot & Option Chain
 */
cron.schedule('17 9 * * 1-5', async () => {
  try {
    const { getOptionChain } = require('./api/dhan/dhanClient');
    const { setOpenPriceData } = require('./utils/srCalculator');
    logger.info('[09:17 AM IST] Capturing & locking 09:17 AM Day Open prices...');
    const chainData = await getOptionChain('NIFTY');
    if (chainData && chainData.chain && chainData.chain.length > 0) {
      setOpenPriceData(chainData.spot, chainData.chain, '09:17:00 AM', true);
      logger.info(`✅ 09:17 AM Day Open prices locked: Spot=${chainData.spot}, ATM=${chainData.atm}, Strikes=${chainData.chain.length}`);
      wsServer.broadcast('ALERT_FEED', {
        level: 'INFO',
        message: `🔒 09:17 AM Day Open prices locked (Spot: ${chainData.spot})`,
      });
    }
  } catch (err) {
    logger.error('Failed to capture 09:17 AM Day Open prices:', err.message);
  }
}, { timezone: 'Asia/Kolkata' });

/**
 * 15:35 IST daily: EOD summary
 */
cron.schedule('35 15 * * 1-5', async () => {
  logger.info('Running EOD summary...');
  wsServer.broadcast('ALERT_FEED', {
    level: 'INFO',
    message: 'Market closed. EOD summary generating...',
  });
}, { timezone: 'Asia/Kolkata' });

// Periodic memory garbage collection guard
setInterval(() => {
  if (global.gc) {
    try { global.gc(); } catch (e) {}
  }
}, 30000);

// ─── Startup Sequence ─────────────────────────────────────────
async function start() {
  logger.info('='.repeat(60));
  logger.info('  NIFTY OPTIONS AI TRADING PLATFORM');
  logger.info(`  Mode: ${config.trading.paperMode ? '📝 PAPER TRADING' : '🔴 LIVE TRADING'}`);
  logger.info('='.repeat(60));

  // 1. Check DB
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.warn('⚠️ MySQL connection failed or not configured yet. Server will run with memory fallback until DB is started.');
  } else {
    // 2. Initialize risk manager
    try {
      await riskManager.sync();
    } catch (rErr) {
      logger.warn('RiskManager sync warning:', rErr.message);
    }
  }

  // 3. Connect Dhan WebSocket & Live Engine (if API credentials present)
  if (config.dhan.clientId && config.dhan.accessToken) {
    dhanWS.connect();
    dhanWS.subscribe([{ exchangeSegment: 'IDX_I', securityId: '13' }]); // Nifty 50 Index

    liveEngine.start();

    const expiry = getNextWeeklyExpiry();
    logger.info(`Next weekly expiry: ${expiry}`);
  } else {
    logger.warn('⚠️  Dhan API credentials not configured. Running in data-less mode.');
  }

  // 4. Start HTTP server
  httpServer.listen(config.server.port, () => {
    logger.info(`\n✅ Server running at http://localhost:${config.server.port}`);
    logger.info(`✅ WebSocket at ws://localhost:${config.server.port}/ws`);
    logger.info(`✅ Health: http://localhost:${config.server.port}/health\n`);
  });

  // 5. Graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function shutdown() {
  logger.info('Shutting down gracefully...');
  dhanWS.disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

// Export marketDataCache so routes can update it
module.exports = { app, marketDataCache };

start().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
