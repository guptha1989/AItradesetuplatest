const WebSocket = require('ws');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { tickBuffer } = require('../../utils/tickBuffer');
const { wsServer } = require('../../websocket/wsServer');

// Dhan WebSocket feed URL (v2)
const DHAN_WS_URL = 'wss://api-order.dhan.co';

// Message type constants (Dhan protocol)
const MSG_TYPE = {
  TICK_DATA: 2,
  MARKET_DEPTH: 4,
  PREV_CLOSE: 6,
  SUBSCRIBE: 11,
  DISCONNECT: 12,
};

class DhanWebSocket {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnect = 2;
    this.reconnectDelayMs = 3000;
    this.subscribedInstruments = new Set();
    this.pingInterval = null;
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

    logger.info('Connecting to Dhan WebSocket...');
    this.ws = new WebSocket(DHAN_WS_URL, {
      headers: {
        'access-token': config.dhan.accessToken,
        'client-id': config.dhan.clientId,
      },
    });

    this.ws.on('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('✅ Dhan WebSocket connected');
      this._startPing();
      // Re-subscribe to all instruments after reconnect
      if (this.subscribedInstruments.size > 0) {
        this.subscribe(Array.from(this.subscribedInstruments));
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
    instruments.forEach((inst) => {
      this.subscribedInstruments.add(JSON.stringify(inst));
    });

    if (!this.isConnected) {
      logger.warn('WS not connected — subscription queued for reconnect');
      return;
    }

    const payload = JSON.stringify({
      RequestCode: MSG_TYPE.SUBSCRIBE,
      InstrumentCount: instruments.length,
      InstrumentList: instruments.map((inst) => ({
        ExchangeSegment: inst.exchangeSegment,
        SecurityId: inst.securityId,
      })),
    });

    this.ws.send(payload);
    logger.debug(`Subscribed to ${instruments.length} instruments`);
  }

  _onMessage(raw) {
    try {
      // Dhan sends binary frames for tick data
      let tick;
      if (Buffer.isBuffer(raw)) {
        tick = this._parseBinaryTick(raw);
      } else {
        tick = JSON.parse(raw.toString());
      }

      if (!tick) return;

      const key = `${tick.securityId}_${tick.exchangeSegment}`;
      tickBuffer.push(key, tick);

      // Broadcast to UI clients via our WS server
      wsServer.broadcast('TICK_FEED', tick);

    } catch (err) {
      logger.error('Failed to parse Dhan WS message:', err.message);
    }
  }

  /**
   * Parse Dhan binary tick frame.
   * Structure (bytes): [type:1][exchange:1][securityId:4][ltp:4][ltq:4][ltt:4][atp:4][vol:4][oi:4][ch:4][chp:4]
   * Reference: Dhan WebSocket API docs
   */
  _parseBinaryTick(buffer) {
    if (buffer.length < 38) return null;

    const msgType = buffer.readUInt8(0);
    if (msgType !== MSG_TYPE.TICK_DATA) return null;

    return {
      exchangeSegment: buffer.readUInt8(1),
      securityId: buffer.readInt32BE(2).toString(),
      ltp: buffer.readFloatBE(6),
      ltq: buffer.readInt32BE(10),
      ltt: buffer.readInt32BE(14),
      atp: buffer.readFloatBE(18),
      volume: buffer.readInt32BE(22),
      oi: buffer.readInt32BE(26),
      change: buffer.readFloatBE(30),
      changePercent: buffer.readFloatBE(34),
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
      logger.error('Max reconnect attempts reached. Dhan WS disconnected permanently.');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * this.reconnectAttempts;
    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnect})`);
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
