const WebSocket = require('ws');
const logger = require('../utils/logger');

// Channel definitions — clients subscribe to these
const CHANNELS = {
  TICK_FEED: 'TICK_FEED',       // Raw LTP ticks (100ms)
  SIGNAL_FEED: 'SIGNAL_FEED',   // AI-generated signals
  ORDER_FEED: 'ORDER_FEED',     // Order status updates
  PNL_FEED: 'PNL_FEED',         // Real-time P&L
  ALERT_FEED: 'ALERT_FEED',     // Risk alerts, notifications
  CHAIN_FEED: 'CHAIN_FEED',     // Option chain snapshots (every 5s)
  STATUS_FEED: 'STATUS_FEED',   // System status (WS health, paper mode)
};

class WsServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId → { ws, subscriptions: Set }
  }

  /**
   * Attach to an existing HTTP server.
   * @param {http.Server} httpServer
   */
  attach(httpServer) {
    this.wss = new WebSocket.Server({ server: httpServer, path: '/ws' });
    logger.info('WebSocket server attached at /ws');

    this.wss.on('connection', (ws, req) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      this.clients.set(clientId, { ws, subscriptions: new Set(Object.values(CHANNELS)) });
      logger.info(`WS client connected: ${clientId} (total: ${this.clients.size})`);

      // Send welcome + current system status
      this._send(ws, 'STATUS_FEED', {
        type: 'CONNECTED',
        clientId,
        channels: Object.values(CHANNELS),
        serverTime: new Date().toISOString(),
      });

      ws.on('message', (msg) => this._handleClientMessage(clientId, ws, msg));
      const cleanup = () => {
        if (this.clients.has(clientId)) {
          this.clients.delete(clientId);
          logger.info(`WS client disconnected: ${clientId} (remaining: ${this.clients.size})`);
        }
      };
      ws.on('close', cleanup);
      ws.on('error', (err) => {
        logger.error(`WS client error [${clientId}]:`, err.message);
        cleanup();
      });
    });
  }

  _handleClientMessage(clientId, ws, raw) {
    try {
      const msg = JSON.parse(raw.toString());
      const client = this.clients.get(clientId);

      switch (msg.type) {
        case 'SUBSCRIBE':
          // Client can narrow down which channels to receive
          if (msg.channels && Array.isArray(msg.channels)) {
            client.subscriptions = new Set(msg.channels);
            this._send(ws, 'STATUS_FEED', { type: 'SUBSCRIBED', channels: msg.channels });
          }
          break;

        case 'UNSUBSCRIBE':
          if (msg.channels && Array.isArray(msg.channels)) {
            msg.channels.forEach((ch) => client.subscriptions.delete(ch));
          }
          break;

        case 'PING':
          this._send(ws, 'STATUS_FEED', { type: 'PONG', ts: Date.now() });
          break;

        default:
          logger.debug(`Unknown WS message type from ${clientId}: ${msg.type}`);
      }
    } catch (err) {
      logger.error(`Failed to parse WS message from ${clientId}:`, err.message);
    }
  }

  /**
   * Broadcast a message to all subscribed clients on a channel.
   * @param {string} channel - One of CHANNELS keys
   * @param {object} data
   */
  broadcast(channel, data) {
    if (this.clients.size === 0) return;
    const payload = JSON.stringify({ channel, data, ts: Date.now() });

    this.clients.forEach(({ ws, subscriptions }, clientId) => {
      if (!subscriptions.has(channel)) return;
      if (ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(payload);
      } catch (err) {
        logger.error(`Failed to send to ${clientId}:`, err.message);
        this.clients.delete(clientId);
      }
    });
  }

  /**
   * Send to a single client.
   */
  _send(ws, channel, data) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ channel, data, ts: Date.now() }));
  }

  /**
   * Broadcast a risk alert to all clients.
   */
  alert(level, message, details = {}) {
    this.broadcast('ALERT_FEED', { level, message, details, ts: new Date().toISOString() });
    logger.warn(`ALERT [${level}]: ${message}`);
  }

  getStats() {
    return { connectedClients: this.clients.size };
  }
}

// Singleton
const wsServer = new WsServer();

module.exports = { wsServer, CHANNELS };
