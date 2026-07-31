require('dotenv').config();

module.exports = {
  server: {
    port: parseInt(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nifty_trading',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  dhan: {
    clientId: process.env.DHAN_CLIENT_ID,
    accessToken: process.env.DHAN_ACCESS_TOKEN,
    baseUrl: process.env.DHAN_BASE_URL || 'https://api.dhan.co/v2',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
  trading: {
    paperMode: process.env.PAPER_TRADING_MODE === 'true',
    maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || 5000,
    maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS) || 4,
    signalConfidenceThreshold: parseFloat(process.env.SIGNAL_CONFIDENCE_THRESHOLD) || 70,
    geminiSignalIntervalSec: parseInt(process.env.GEMINI_SIGNAL_INTERVAL_SEC) || 300,
    tickSnapshotIntervalSec: parseInt(process.env.TICK_SNAPSHOT_INTERVAL_SEC) || 60,
  },
  nifty: {
    symbol: process.env.NIFTY_SYMBOL || 'NIFTY',
    indexSymbol: process.env.NIFTY_INDEX_SYMBOL || 'NIFTY 50',
    defaultExpiryType: process.env.DEFAULT_EXPIRY_TYPE || 'WEEKLY',
    strikeRange: parseInt(process.env.STRIKE_RANGE) || 10,
    lotSize: parseInt(process.env.LOT_SIZE) || 25,
  },
};
