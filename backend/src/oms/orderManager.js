const { v4: uuidv4 } = require('uuid');
const { placeOrder, cancelOrder, getOrders, getPositions } = require('../api/dhan/dhanClient');
const { riskManager } = require('./riskManager');
const { query } = require('../config/db');
const { wsServer } = require('../websocket/wsServer');
const logger = require('../utils/logger');

/**
 * Order Manager — the central order routing hub.
 * All trade execution flows through here.
 */
class OrderManager {
  constructor() {
    this.pendingOrders = new Map(); // orderId → order details
  }

  /**
   * Execute a trade signal as one or more orders (legs).
   * @param {object} signal - From Gemini signalAnalyzer
   */
  async executeSignal(signal) {
    logger.info(`Executing signal: ${signal.strategy} [${signal.bias}]`);

    const results = [];
    for (const leg of signal.legs) {
      try {
        const order = await this._buildOrder(leg, signal);
        const result = await this.placeNewOrder(order);
        results.push({ leg, result, success: true });
      } catch (err) {
        logger.error(`Leg execution failed:`, err.message);
        results.push({ leg, error: err.message, success: false });
      }
    }

    return results;
  }

  /**
   * Place a new order with risk checks.
   * @param {object} orderParams
   */
  async placeNewOrder(orderParams) {
    // Risk check first
    const riskCheck = await riskManager.check(orderParams);
    if (!riskCheck.allowed) {
      logger.warn(`Order blocked by risk manager: ${riskCheck.reason}`);
      wsServer.alert('WARNING', `Order blocked: ${riskCheck.reason}`, orderParams);
      throw new Error(`Risk check failed: ${riskCheck.reason}`);
    }

    const internalId = uuidv4();
    const orderWithId = { ...orderParams, internalId };

    // Send to Dhan (or simulate in paper mode)
    const response = await placeOrder(orderWithId);

    // Persist to DB
    await this._saveOrderToDB(orderWithId, response);

    // Track in memory
    this.pendingOrders.set(response.orderId || internalId, {
      ...orderWithId,
      dhanOrderId: response.orderId,
      status: response.orderStatus || 'PENDING',
    });

    // Broadcast to UI
    wsServer.broadcast('ORDER_FEED', {
      type: 'ORDER_PLACED',
      order: { ...orderWithId, ...response },
    });

    // Update risk manager position count
    riskManager.openPositionCount++;

    logger.info(`✅ Order placed: ${orderParams.symbol} ${orderParams.action} ${orderParams.qty} @ MKT [${response.orderId || internalId}]`);
    return response;
  }

  /**
   * Cancel an existing order.
   */
  async cancelExistingOrder(orderId, reason = 'Manual cancel') {
    const result = await cancelOrder(orderId);
    this.pendingOrders.delete(orderId);

    wsServer.broadcast('ORDER_FEED', {
      type: 'ORDER_CANCELLED',
      orderId,
      reason,
    });

    logger.info(`Order cancelled: ${orderId} — ${reason}`);
    return result;
  }

  /**
   * Sync orders and positions from Dhan.
   */
  async syncFromDhan() {
    try {
      const [orders, positions] = await Promise.all([getOrders(), getPositions()]);

      wsServer.broadcast('ORDER_FEED', { type: 'ORDERS_SYNCED', orders });
      wsServer.broadcast('PNL_FEED', { type: 'POSITIONS_SYNCED', positions });

      return { orders, positions };
    } catch (err) {
      logger.error('Failed to sync from Dhan:', err.message);
    }
  }

  _buildOrder(leg, signal) {
    return {
      symbol: `NIFTY${leg.strike}${signal.expiryDate?.replace(/-/g, '')}${leg.type}`,
      exchangeSegment: 'NSE_FO',
      instrument: 'OPTIDX',
      securityId: leg.securityId || null, // filled by option chain mapper
      action: leg.action,
      qty: leg.lots * 25, // Nifty lot size
      orderType: 'MARKET',
      productType: 'INTRADAY',
      signalId: signal.id,
    };
  }

  async _saveOrderToDB(order, response) {
    try {
      await query(
        `INSERT INTO trades (signal_id, symbol, entry_price, qty, entry_time, status)
         VALUES (?, ?, ?, ?, NOW(), 'OPEN')`,
        [order.signalId || null, order.symbol, 0, order.qty]
      );
    } catch (err) {
      logger.error('Failed to save order to DB:', err.message);
    }
  }

  getStatus() {
    return {
      pendingOrderCount: this.pendingOrders.size,
      orders: Array.from(this.pendingOrders.values()),
    };
  }
}

const orderManager = new OrderManager();
module.exports = { orderManager };
