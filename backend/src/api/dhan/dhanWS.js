const WebSocket = require('ws');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { tickBuffer } = require('../../utils/tickBuffer');
const { wsServer } = require('../../websocket/wsServer');

// Dhan WebSocket feed URL (v2)
// Message type constants (Dhan protocol)
const MSG_TYPE = {
  TICK_DATA: 2,
  MARKET_DEPTH: 4,
  PREV_CLOSE: 6,
  SUBSCRIBE: 15, // Dhan HQ v2 Ticker Feed RequestCode
  UNSUBSCRIBE: 21,
};

class DhanWebSocket {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnect = 5;
    this.reconnectDelayMs = 3000;
    this.subscribedInstruments = new Set();
    this.pingInterval = null;
    this.prevCloseMap = { '13': 24347.80 };
  }

  connect() {
    this._stopPing();
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    logger.info('Connecting to Dhan WebSocket feed...');
    const wsUrl = `wss://api-feed.dhan.co?version=2&token=${encodeURIComponent(config.dhan.accessToken)}&clientId=${encodeURIComponent(config.dhan.clientId)}&authType=2`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('✅ Dhan WebSocket connected');
      this._startPing();
      
      // Auto-subscribe to Nifty Index (13) by default
      this.subscribe([{ exchangeSegment: 'IDX_I', securityId: '13' }]);

      // Re-subscribe to all saved instruments
      if (this.subscribedInstruments.size > 0) {
        const parsed = Array.from(this.subscribedInstruments).map(s => JSON.parse(s));
        this._sendSubscribe(parsed);
      }
    });

    this.ws.on('message', (data) => this._onMessage(data));
    this.ws.on('error', (err) => logger.error('Dhan WS Error:', err.message));
    this.ws.on('close', (code, reason) => {
      this.isConnected = false;
      this._stopPing();
      logger.warn(`Dhan WS closed [${code}]: ${reason}. Reconnecting...`);
      this._scheduleReconnect();
    });
  }

  /**
   * Subscribe to instruments for tick data.
   * @param {Array<{exchangeSegment, securityId}>} instruments
   */
  subscribe(instruments) {
    if (!instruments || instruments.length === 0) return;

    instruments.forEach((inst) => {
      this.subscribedInstruments.add(JSON.stringify(inst));
    });

    if (!this.isConnected) {
      logger.warn('WS not connected — subscription queued for reconnect');
      return;
    }

    this._sendSubscribe(instruments);
  }

  _sendSubscribe(instruments) {
    try {
      const payload = JSON.stringify({
        RequestCode: MSG_TYPE.SUBSCRIBE,
        InstrumentCount: instruments.length,
        InstrumentList: instruments.map((inst) => ({
          ExchangeSegment: inst.exchangeSegment || 'IDX_I',
          SecurityId: String(inst.securityId),
        })),
      });

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(payload);
        logger.debug(`Subscribed to ${instruments.length} Dhan instruments`);
      }
    } catch (err) {
      logger.error('Failed to send Dhan WS subscription:', err.message);
    }
  }

  _onMessage(raw) {
    try {
      let tick = null;
      if (Buffer.isBuffer(raw)) {
        tick = this._parseBinaryTick(raw);
      } else {
        tick = JSON.parse(raw.toString());
      }

      if (!tick || !tick.securityId) return;

      const key = `${tick.securityId}_${tick.exchangeSegment}`;
      tickBuffer.push(key, tick);

      // Require liveEngine dynamically to avoid circular dependency
      const { liveEngine } = require('./liveEngine');

      if (tick.msgType === MSG_TYPE.PREV_CLOSE) {
        this.prevCloseMap[tick.securityId] = tick.ltp;
      }

      if (tick.securityId === '13') {
        const prevClose = this.prevCloseMap['13'] || 24347.80;
        const spot = tick.ltp;
        const change = parseFloat((spot - prevClose).toFixed(2));
        const changePercent = parseFloat(((change / prevClose) * 100).toFixed(2));
        const timestamp = new Date().toLocaleTimeString('en-IN');

        // Pass tick directly to liveEngine for real-time calculation
        liveEngine.onTick(spot, prevClose);

        // Broadcast realtime tick feed to all UI clients
        wsServer.broadcast('TICK_FEED', {
          type: 'TICK',
          symbol: 'NIFTY',
          spot,
          ltp: spot,
          change,
          changePercent,
          vix: 13.2,
          time: timestamp,
        });
      } else {
        // Option strike tick update
        wsServer.broadcast('TICK_FEED', tick);
      }

    } catch (err) {
      logger.error('Failed to parse Dhan WS message:', err.message);
    }
  }

  /**
   * Parse Dhan binary tick frame.
   * Structure:
   * Byte 0: ResponseCode / MsgType (2 = Ticker, 6 = Prev Close)
   * Byte 1: ExchangeSegment
   * Bytes 4-7 (Int32 LE): SecurityId
   * Bytes 8-11 (Float LE): LTP
   */
  _parseBinaryTick(buffer) {
    if (buffer.length < 8) return null;

    const msgType = buffer.readUInt8(0);
    const exchangeSegment = buffer.readUInt8(1);
    const securityId = buffer.readInt32LE(4).toString();
    const ltp = parseFloat(buffer.readFloatLE(8).toFixed(2));

    return {
      msgType,
      exchangeSegment,
      securityId,
      ltp,
      timestamp: new Date().toISOString(),
    };
  }

  _startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 20000);
  }

  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) {
      logger.error('Max reconnect attempts reached for Dhan WS.');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * this.reconnectAttempts;
    logger.info(`Reconnecting Dhan WS in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnect})`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this._stopPing();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    logger.info('Dhan WebSocket disconnected');
  }

  getStatus() {
    return {
      connected: this.isConnected,
      subscribedCount: this.subscribedInstruments.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton
const dhanWS = new DhanWebSocket();

module.exports = { dhanWS };
