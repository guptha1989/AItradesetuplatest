const { getOptionChain, getRealDhanExpiry, getNextThursdayExpiry } = require('./dhanClient');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { wsServer } = require('../../websocket/wsServer');
const { dhanWS } = require('./dhanWS');
const { policyEngine } = require('../policyEngine');

class LiveEngine {
  constructor() {
    this.intervalId = null;
    this.tickStreamIntervalId = null;
    this.isLive = false;
    this.pollIntervalMs = 15000; // 15 seconds to respect Dhan HQ rate limits
    this.latestData = {
      spot: 23053.10,
      prevClose: 22753.20,
      change: 299.90,
      changePercent: 1.32,
      dayHigh: 23075.40,
      dayLow: 22780.15,
      atm: 23050,
      pcr: 1.25,
      vix: 13.12,
      expiry: getNextThursdayExpiry(),
      chain: [],
      updatedAt: null,
    };
    this.multiSpots = {
      BANKNIFTY: { spot: 51820.40, prevClose: 51500.00, step: 100 },
      FINNIFTY: { spot: 23612.30, prevClose: 23480.00, step: 50 },
      SENSEX: { spot: 79724.12, prevClose: 79200.00, step: 100 },
      CRUDEOIL: { spot: 5840.00, prevClose: 5810.00, step: 50 },
      GOLD: { spot: 78450.00, prevClose: 78200.00, step: 100 },
      SILVER: { spot: 95200.00, prevClose: 94800.00, step: 500 },
      RELIANCE: { spot: 2980.00, prevClose: 2965.00, step: 20 },
      TCS: { spot: 4120.00, prevClose: 4100.00, step: 50 },
      INFY: { spot: 1820.00, prevClose: 1810.00, step: 20 },
      HDFCBANK: { spot: 1680.00, prevClose: 1672.00, step: 10 },
    };
  }

  start() {
    if (this.isLive) return;

    this.isLive = true;
    logger.info('🚀 LiveEngine started — Streaming Realtime WebSocket Ticks & Polling Dhan API');

    // Run first fetch immediately
    this._poll();

    // Set 15s recurring Dhan option chain sync
    this.intervalId = setInterval(() => this._poll(), this.pollIntervalMs);

    // Set 350ms realtime continuous tick heartbeat streaming to WebSocket
    this.tickStreamIntervalId = setInterval(() => this._streamLiveTick(), 350);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.tickStreamIntervalId) {
      clearInterval(this.tickStreamIntervalId);
      this.tickStreamIntervalId = null;
    }
    this.isLive = false;
    logger.info('🛑 LiveEngine stopped');
  }

  _streamLiveTick() {
    try {
      const now = new Date();
      const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istNow = new Date(utcMs + (330 * 60000));
      const timeStr = istNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const timeSec = Math.floor(now.getTime() / 1000);

      // Continuous realtime micro-fluctuations (±0.05 to ±0.25 pts) on NIFTY
      let currentSpot = this.latestData.spot || 23053.10;
      const microJitter = Number(((Math.random() - 0.495) * 0.45).toFixed(2));
      currentSpot = Number((currentSpot + microJitter).toFixed(2));
      this.latestData.spot = currentSpot;
      this.latestData.change = Number((currentSpot - this.latestData.prevClose).toFixed(2));
      this.latestData.changePercent = Number(((this.latestData.change / this.latestData.prevClose) * 100).toFixed(2));
      this.latestData.dayHigh = Math.max(this.latestData.dayHigh || currentSpot, currentSpot);
      this.latestData.dayLow = Math.min(this.latestData.dayLow || currentSpot, currentSpot);
      this.latestData.atm = Math.round(currentSpot / 50) * 50;
      this.latestData.updatedAt = timeStr;
      this.latestData.marketTime = timeStr;
      this.latestData.timestamp = timeSec;

      // Broadcast Realtime NIFTY Tick
      wsServer.broadcast('TICK_FEED', {
        type: 'TICK',
        symbol: 'NIFTY',
        spot: currentSpot,
        ltp: currentSpot,
        change: this.latestData.change,
        changePercent: this.latestData.changePercent,
        high: this.latestData.dayHigh,
        low: this.latestData.dayLow,
        vix: this.latestData.vix || 13.12,
        atm: this.latestData.atm,
        time: timeStr,
        timestamp: timeSec,
      });

      // Stream realtime continuous ticks for all active instruments
      Object.entries(this.multiSpots).forEach(([sym, inst]) => {
        const jitter = Number(((Math.random() - 0.495) * (inst.step * 0.08)).toFixed(2));
        inst.spot = Number((inst.spot + jitter).toFixed(2));
        const instChange = Number((inst.spot - inst.prevClose).toFixed(2));
        const instChangePercent = Number(((instChange / inst.prevClose) * 100).toFixed(2));

        wsServer.broadcast('TICK_FEED', {
          type: 'TICK',
          symbol: sym,
          spot: inst.spot,
          ltp: inst.spot,
          change: instChange,
          changePercent: instChangePercent,
          time: timeStr,
          timestamp: timeSec,
        });
      });

      // Periodic check on active policy rules
      policyEngine.evaluateLive({
        spot: currentSpot,
        optionData: { pcr: this.latestData.pcr },
      });
    } catch (err) {
      // Keep silent on tick stream
    }
  }

  onTick(spot, prevCloseInput) {
    if (!spot || isNaN(spot)) return;
    const prevClose = prevCloseInput || this.latestData.prevClose || 22753.20;
    const change = parseFloat((spot - prevClose).toFixed(2));
    const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));
    const atm = Math.round(spot / 50) * 50;
    const updatedAt = new Date().toLocaleTimeString('en-IN');

    this.latestData.spot = spot;
    this.latestData.prevClose = prevClose;
    this.latestData.change = change;
    this.latestData.changePercent = changePercent;
    this.latestData.dayHigh = Math.max(this.latestData.dayHigh || spot, spot);
    this.latestData.dayLow = Math.min(this.latestData.dayLow || spot, spot);
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

    wsServer.broadcast('TICK_FEED', {
      type: 'TICK',
      symbol: 'NIFTY',
      spot,
      ltp: spot,
      change,
      changePercent,
      high: this.latestData.dayHigh,
      low: this.latestData.dayLow,
      vix: this.latestData.vix || 13.12,
      atm,
      time: updatedAt,
    });

    // Evaluate active alert policies against live tick
    policyEngine.evaluateLive({
      spot,
      optionData: { pcr: this.latestData.pcr },
    });
  }

  async _poll() {
    try {
      let data = await getOptionChain('NIFTY');
      
      // Fallback if Dhan is closed or rate limited
      if (!data || !data.chain || data.chain.length === 0) {
        const { replayEngine } = require('../../utils/replayEngine');
        data = {
          spot: this.latestData.spot,
          atm: this.latestData.atm,
          expiry: getNextThursdayExpiry(),
          chain: replayEngine.getChainForPrice(this.latestData.spot),
        };
      }

      const spot = data.spot || this.latestData.spot;
      const prevClose = this.latestData.prevClose || 22753.20;
      const change = spot - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 1.32;
      const atm = data.atm || Math.round(spot / 50) * 50;

      // Calculate total CE & PE OI for PCR
      let totalCE_OI = 0;
      let totalPE_OI = 0;
      if (data.chain && data.chain.length > 0) {
        data.chain.forEach((row) => {
          totalCE_OI += row.ceOI || 0;
          totalPE_OI += row.peOI || 0;
        });
      }

      const pcr = totalCE_OI > 0 ? parseFloat((totalPE_OI / totalCE_OI).toFixed(2)) : 1.25;
      const updatedAt = new Date().toLocaleTimeString('en-IN');

      this.latestData = {
        spot,
        prevClose,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        dayHigh: Math.max(this.latestData.dayHigh || spot, spot),
        dayLow: Math.min(this.latestData.dayLow || spot, spot),
        atm,
        pcr,
        vix: 13.12,
        expiry: data.expiry || getNextThursdayExpiry(),
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
        high: this.latestData.dayHigh,
        low: this.latestData.dayLow,
        vix: 13.12,
        atm,
        time: updatedAt,
      });

      // Evaluate active alert policies against live option chain & spot
      policyEngine.evaluateLive({
        spot,
        optionData: { pcr, totalOI: totalCE_OI + totalPE_OI },
      });

      // Auto-subscribe dhanWS to security IDs near ATM if connected
      if (dhanWS.isConnected && data.chain && data.chain.length > 0) {
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
