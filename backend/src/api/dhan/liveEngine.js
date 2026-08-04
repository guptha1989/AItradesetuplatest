const { getOptionChain, getRealDhanExpiry } = require('./dhanClient');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { wsServer } = require('../../websocket/wsServer');
const { dhanWS } = require('./dhanWS');

class LiveEngine {
  constructor() {
    this.intervalId = null;
    this.isLive = false;
    this.pollIntervalMs = 5000;
    this.latestData = {
      spot: 24597.15,
      prevClose: 24347.80,
      change: 249.35,
      changePercent: 1.02,
      atm: 24600,
      pcr: 1.05,
      expiry: '2026-08-04',
      chain: [],
      updatedAt: null,
    };
  }

  start() {
    if (this.isLive) return;
    if (!config.dhan.clientId || !config.dhan.accessToken) {
      logger.warn('⚠️ Dhan credentials missing — LiveEngine will not start background polling');
      return;
    }

    this.isLive = true;
    logger.info('🚀 LiveEngine started — Polling Dhan API every 5s for real-time market data');

    // Run first fetch immediately
    this._poll();

    // Set recurring timer
    this.intervalId = setInterval(() => this._poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isLive = false;
    logger.info('🛑 LiveEngine stopped');
  }

  onTick(spot, prevCloseInput) {
    if (!spot || isNaN(spot)) return;
    const prevClose = prevCloseInput || this.latestData.prevClose || 24347.80;
    const change = parseFloat((spot - prevClose).toFixed(2));
    const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));
    const atm = Math.round(spot / 50) * 50;
    const updatedAt = new Date().toLocaleTimeString('en-IN');

    this.latestData.spot = spot;
    this.latestData.prevClose = prevClose;
    this.latestData.change = change;
    this.latestData.changePercent = changePercent;
    this.latestData.atm = atm;
    this.latestData.updatedAt = updatedAt;

    if (this.latestData.chain && this.latestData.chain.length > 0) {
      this.latestData.chain.forEach((row) => {
        row.isATM = row.strike === atm;
      });
    }

    // Broadcast real-time tick-by-tick update to all connected frontend clients
    wsServer.broadcast('CHAIN_FEED', {
      spot,
      spotChange: change,
      spotChangePercent: changePercent,
      atm,
      pcr: this.latestData.pcr,
      expiry: this.latestData.expiry,
      chain: this.latestData.chain,
      updatedAt,
    });
  }

  async _poll() {
    try {
      const data = await getOptionChain('NIFTY');
      if (!data || !data.chain || data.chain.length === 0) return;

      // Ignore mock fallback data if real live data is already present
      if (data.spot === 24383.6 && this.latestData.spot && this.latestData.spot !== 24383.6) {
        return;
      }

      const spot = data.spot || this.latestData.spot;
      const prevClose = this.latestData.prevClose || (spot - 50);
      const change = spot - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;
      const atm = data.atm || Math.round(spot / 50) * 50;

      // Calculate total CE & PE OI for PCR
      let totalCE_OI = 0;
      let totalPE_OI = 0;
      data.chain.forEach((row) => {
        totalCE_OI += row.ceOI || 0;
        totalPE_OI += row.peOI || 0;
      });

      const pcr = totalCE_OI > 0 ? parseFloat((totalPE_OI / totalCE_OI).toFixed(2)) : 1.0;

      const updatedAt = new Date().toLocaleTimeString('en-IN');

      this.latestData = {
        spot,
        prevClose,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        atm,
        pcr,
        expiry: data.expiry || '2026-08-04',
        chain: data.chain,
        updatedAt,
      };

      // Broadcast real-time option chain & spot to all WS clients
      wsServer.broadcast('CHAIN_FEED', {
        spot,
        spotChange: this.latestData.change,
        spotChangePercent: this.latestData.changePercent,
        atm,
        pcr,
        expiry: this.latestData.expiry,
        chain: data.chain,
        updatedAt,
      });

      // Broadcast spot tick update
      wsServer.broadcast('TICK_FEED', {
        type: 'TICK',
        symbol: 'NIFTY',
        spot,
        ltp: spot,
        change: this.latestData.change,
        changePercent: this.latestData.changePercent,
        vix: 13.2,
        time: updatedAt,
      });

      // Auto-subscribe dhanWS to security IDs near ATM
      if (dhanWS.isConnected) {
        const nearATM = data.chain.filter(r => Math.abs(r.strike - atm) <= 300);
        const instruments = [];
        nearATM.forEach(r => {
          if (r.ceSecurityId) instruments.push({ exchangeSegment: 'NSE_FNO', securityId: r.ceSecurityId });
          if (r.peSecurityId) instruments.push({ exchangeSegment: 'NSE_FNO', securityId: r.peSecurityId });
        });
        if (instruments.length > 0) {
          dhanWS.subscribe(instruments);
        }
      }

    } catch (err) {
      logger.warn('LiveEngine poll warning:', err.message);
    }
  }

  getLatestData() {
    return this.latestData;
  }
}

const liveEngine = new LiveEngine();
module.exports = { liveEngine };
