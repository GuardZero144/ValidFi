const crypto = require("crypto");

class ProofCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;

    // Periodic cleanup every 60 seconds
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }

  _makeKey(input) {
    const serialized = JSON.stringify(input, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    );
    return crypto.createHash("sha256").update(serialized).digest("hex");
  }

  get(input) {
    const key = this._makeKey(input);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(input, value) {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this._evictOldest();
    }

    const key = this._makeKey(input);
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    });
  }

  has(input) {
    return this.get(input) !== null;
  }

  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      ttlMs: this.ttlMs,
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this.clear();
  }
}

module.exports = { ProofCache };
