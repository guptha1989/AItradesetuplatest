const { wsServer } = require('../websocket/wsServer');
const { calcGreeks } = require('./greeksCalc');
const { generateSignal } = require('../api/gemini/signalAnalyzer');
const logger = require('./logger');

/**
 * Replay Engine — simulates a full 375-minute trading day (09:15 to 15:30 IST).
 */
class ReplayEngine {
  constructor() {
    this.status = 'STOPPED'; // 'STOPPED' | 'PLAYING' | 'PAUSED'
    this.speed = 10;          // 1x, 5x, 10x, 60x
    this.currentMinute = 0;   // 0 to 375 (0 = 09:15, 375 = 15:30)
    this.basePrice = 24383.6;  // Starting Nifty 50 spot from Dhan API
    this.spotPrice = 24383.6;
    this.dayHigh = 24383.6;
    this.dayLow = 24383.6;
    this.vix = 13.5;
    this.timer = null;
    this.priceTrajectory = [];
    this.generatedSignals = [];
    this.trades = [];

    // Pre-generate a realistic intraday price curve (375 minutes)
    this.generateTrajectory();
  }

  setBasePrice(price) {
    if (price && price > 1000) {
      this.basePrice = price;
      this.spotPrice = price;
      this.dayHigh = price;
      this.dayLow = price;
      this.generateTrajectory();
    }
  }

  generateTrajectory() {
    let price = this.basePrice || 7284.5;
    const trajectory = [price];

    for (let m = 1; m <= 375; m++) {
      let volMultiplier = 1.0;
      if (m <= 45) volMultiplier = 2.2;       // Opening volatility
      else if (m >= 315) volMultiplier = 2.5;  // Afternoon move
      else if (m >= 135 && m <= 255) volMultiplier = 0.5; // Midday lull

      const wave = Math.sin((m / 375) * Math.PI * 2) * (price * 0.001);
      const noise = (Math.random() - 0.49) * (price * 0.0015) * volMultiplier;
      price = price + wave * 0.05 + noise;

      const minPrice = this.basePrice * 0.95;
      const maxPrice = this.basePrice * 1.05;
      price = Math.max(minPrice, Math.min(maxPrice, price));
      trajectory.push(parseFloat(price.toFixed(2)));
    }
    this.priceTrajectory = trajectory;
  }

  /**
   * Format replay minute into HH:MM string (0 = 09:15, 375 = 15:30)
   */
  getTimeString(minute = this.currentMinute) {
    const startMins = 9 * 60 + 15; // 555 mins from midnight
    const curMins = startMins + minute;
    const hh = String(Math.floor(curMins / 60)).padStart(2, '0');
    const mm = String(curMins % 60).padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  /**
   * Generate full option chain for current replay price
   */
  getChainForPrice(spot) {
    const roundSpot = Math.round((spot || 24383.6) * 10) / 10;
    const key = `${roundSpot}_${this.currentMinute}`;
    
    if (!this._chainMap) this._chainMap = new Map();
    if (this._chainMap.has(key)) {
      return this._chainMap.get(key);
    }

    const atm = Math.round(spot / 50) * 50;
    const strikes = [];
    for (let i = -10; i <= 10; i++) {
      strikes.push(atm + i * 50);
    }

    const tte = Math.max(0.1, (375 - this.currentMinute) / 375 / 365);
    const r = 0.07; // 7% interest rate

    const resChain = strikes.map(strike => {
      const isATM = strike === atm;
      const dist = strike - spot;

      // Volatility smile / skew
      const ivCE = Math.max(8, this.vix + (dist / 100) * 0.5);
      const ivPE = Math.max(8, this.vix - (dist / 100) * 0.8 + 1.2);

      const greeksCE = calcGreeks({ spot, strike, tte: 2, iv: ivCE, type: 'CE' });
      const greeksPE = calcGreeks({ spot, strike, tte: 2, iv: ivPE, type: 'PE' });

      // Simulated OI with accumulation over the day
      const baseOI = Math.abs(Math.sin(strike * 0.01)) * 50000 + 10000;
      const oiTrend = (this.currentMinute / 375) * 15000;
      const ceOI = Math.round(baseOI + (dist < 0 ? oiTrend * 1.5 : oiTrend * 0.5));
      const peOI = Math.round(baseOI + (dist > 0 ? oiTrend * 1.5 : oiTrend * 0.5));

      const ceOIChange = Math.round((Math.sin(this.currentMinute / 10 + strike) * 1200) + (this.currentMinute * 10));
      const peOIChange = Math.round((Math.cos(this.currentMinute / 10 + strike) * 1200) + (this.currentMinute * 12));

      // Buildup classification
      const ceLTP = Math.max(0.5, greeksCE.theoreticalPrice || 10);
      const peLTP = Math.max(0.5, greeksPE.theoreticalPrice || 10);

      return {
        strike,
        isATM,
        ceLTP: parseFloat(ceLTP.toFixed(2)),
        ceIV: parseFloat(ivCE.toFixed(1)),
        ceOI,
        ceOIChange,
        ceOIChangePct: parseFloat(((ceOIChange / Math.max(ceOI, 1)) * 100).toFixed(1)),
        ceVolume: Math.round(ceOI * 0.4 + this.currentMinute * 50),
        ceDelta: parseFloat(greeksCE.delta.toFixed(3)),
        ceGamma: parseFloat(greeksCE.gamma.toFixed(5)),
        ceTheta: parseFloat(greeksCE.theta.toFixed(2)),
        // PE
        peLTP: parseFloat(peLTP.toFixed(2)),
        peIV: parseFloat(ivPE.toFixed(1)),
        peOI,
        peOIChange,
        peOIChangePct: parseFloat(((peOIChange / Math.max(peOI, 1)) * 100).toFixed(1)),
        peVolume: Math.round(peOI * 0.4 + this.currentMinute * 50),
        peDelta: parseFloat(greeksPE.delta.toFixed(3)),
        peGamma: parseFloat(greeksPE.gamma.toFixed(5)),
        peTheta: parseFloat(greeksPE.theta.toFixed(2)),
        // BEP & Buildup
        bep: parseFloat(((ceLTP + peLTP) / 2).toFixed(2)),
        buildup: {
          ce: ceOIChange > 0 ? (dist < 0 ? 'SHORT BUILD-UP' : 'LONG BUILD-UP') : 'SHORT COVERING',
          pe: peOIChange > 0 ? (dist > 0 ? 'SHORT BUILD-UP' : 'LONG BUILD-UP') : 'SHORT COVERING',
        },
      };
    });

    this._chainMap.set(key, resChain);
    return resChain;
  }

  /**
   * Advance replay by 1 minute step
   */
  async step() {
    if (this.currentMinute >= 375) {
      this.pause();
      this.status = 'COMPLETED';
      logger.info('Replay session completed (15:30 IST)');
      return;
    }

    this.currentMinute++;
    const spot = this.priceTrajectory[this.currentMinute];
    this.spotPrice = spot;
    this.dayHigh = Math.max(this.dayHigh, spot);
    this.dayLow = Math.min(this.dayLow, spot);

    const chain = this.getChainForPrice(spot);
    const atm = Math.round(spot / 50) * 50;
    const timeStr = this.getTimeString();

    // Broadcast tick feed
    wsServer.broadcast('TICK_FEED', {
      type: 'TICK',
      symbol: 'NIFTY',
      ltp: spot,
      high: this.dayHigh,
      low: this.dayLow,
      vix: this.vix,
      time: timeStr,
      replayMinute: this.currentMinute,
      progressPct: ((this.currentMinute / 375) * 100).toFixed(1),
    });

    // Broadcast chain feed
    wsServer.broadcast('CHAIN_FEED', {
      symbol: 'NIFTY',
      spot,
      atm,
      expiry: 'CURRENT_WEEKLY',
      chain,
      updatedAt: timeStr,
    });

    // Trigger AI signal every 15 replay minutes
    if (this.currentMinute % 15 === 0) {
      const marketData = {
        spot,
        atm,
        ceIV: 13.2,
        peIV: 14.1,
        vix: this.vix,
        pcr: 1.05,
        tte: 2,
        spotChangePercent: parseFloat(((spot - this.basePrice) / this.basePrice * 100).toFixed(2)),
      };
      try {
        const signal = await generateSignal(marketData);
        if (signal) this.generatedSignals.push(signal);
      } catch (err) {
        logger.warn('Replay signal gen warn:', err.message);
      }
    }
  }

  start() {
    if (this.status === 'PLAYING') return;
    this.status = 'PLAYING';
    logger.info(`Replay started at minute ${this.currentMinute} (${this.getTimeString()}) with speed ${this.speed}x`);

    const intervalMs = Math.max(50, 1000 / this.speed);
    this.timer = setInterval(async () => {
      await this.step();
    }, intervalMs);
  }

  pause() {
    this.status = 'PAUSED';
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    logger.info(`Replay paused at minute ${this.currentMinute} (${this.getTimeString()})`);
  }

  setSpeed(newSpeed) {
    this.speed = newSpeed;
    if (this.status === 'PLAYING') {
      this.pause();
      this.start();
    }
  }

  seek(minute) {
    this.currentMinute = Math.max(0, Math.min(375, minute));
    const spot = this.priceTrajectory[this.currentMinute];
    this.spotPrice = spot;
    logger.info(`Replay seeked to minute ${this.currentMinute} (${this.getTimeString()}), Spot: ${spot}`);
    this.step();
  }

  reset() {
    this.pause();
    this.status = 'STOPPED';
    this.currentMinute = 0;
    this.spotPrice = this.basePrice || 24383.6;
    this.dayHigh = this.basePrice || 24383.6;
    this.dayLow = this.basePrice || 24383.6;
    this.generatedSignals = [];
    this.generateTrajectory();
    logger.info('Replay reset to 09:15 IST');
  }

  getStatus() {
    return {
      status: this.status,
      speed: this.speed,
      currentMinute: this.currentMinute,
      timeString: this.getTimeString(),
      spot: this.spotPrice,
      dayHigh: this.dayHigh,
      dayLow: this.dayLow,
      progressPct: parseFloat(((this.currentMinute / 375) * 100).toFixed(1)),
      totalSignals: this.generatedSignals.length,
    };
  }

  // Get current snapshot of option chain for REST endpoint fallback
  getCurrentChain() {
    return this.getChainForPrice(this.spotPrice);
  }
}

const replayEngine = new ReplayEngine();
module.exports = { replayEngine, ReplayEngine };
