/**
 * In-memory circular tick buffer.
 * Stores the last N ticks per symbol key without growing unbounded.
 */
class TickBuffer {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.buffers = new Map(); // key → { data: [], head: 0, size: 0 }
  }

  _getOrCreate(key) {
    if (!this.buffers.has(key)) {
      this.buffers.set(key, {
        data: new Array(this.maxSize).fill(null),
        head: 0,
        size: 0,
      });
    }
    return this.buffers.get(key);
  }

  push(key, tick) {
    const buf = this._getOrCreate(key);
    buf.data[buf.head] = { ...tick, _ts: Date.now() };
    buf.head = (buf.head + 1) % this.maxSize;
    buf.size = Math.min(buf.size + 1, this.maxSize);
  }

  /**
   * Get the last N ticks for a key, in chronological order.
   */
  getLast(key, n = 10) {
    const buf = this.buffers.get(key);
    if (!buf || buf.size === 0) return [];
    const count = Math.min(n, buf.size);
    const result = [];
    for (let i = count; i >= 1; i--) {
      const idx = (buf.head - i + this.maxSize) % this.maxSize;
      if (buf.data[idx] !== null) result.push(buf.data[idx]);
    }
    return result;
  }

  /**
   * Get the very latest tick for a key.
   */
  getLatest(key) {
    const buf = this.buffers.get(key);
    if (!buf || buf.size === 0) return null;
    const idx = (buf.head - 1 + this.maxSize) % this.maxSize;
    return buf.data[idx];
  }

  /**
   * Get all active keys (symbols being tracked).
   */
  getKeys() {
    return Array.from(this.buffers.keys());
  }

  /**
   * Clear buffer for a specific key.
   */
  clear(key) {
    this.buffers.delete(key);
  }

  stats() {
    const result = {};
    this.buffers.forEach((buf, key) => {
      result[key] = { size: buf.size, maxSize: this.maxSize };
    });
    return result;
  }
}

// Singleton instance shared across modules
const tickBuffer = new TickBuffer(500);

module.exports = { TickBuffer, tickBuffer };
