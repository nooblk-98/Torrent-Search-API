/**
 * Stale-while-revalidate cache layer on top of node-cache.
 *
 * Entries are stored with a `freshUntil` timestamp and kept in node-cache for
 * freshTTL + staleTTL seconds. Reads return:
 *   - { value, state: 'fresh' }  when still within freshTTL
 *   - { value, state: 'stale' }  when past freshTTL but within staleTTL
 *   - { value: null, state: 'miss' } otherwise
 *
 * Callers serve stale data instantly and trigger a background refresh, so users
 * never wait on a scrape for an entry that was recently warm.
 */

const cache = require('./cache');
const config = require('../config');

const FRESH_TTL = config.cache.stdTTL;
const STALE_TTL = config.cache.staleTTL ?? 0;

function getEntry(key, { freshTTL = FRESH_TTL } = {}) {
  const entry = cache.get(key);
  if (!entry || typeof entry !== 'object' || !('value' in entry)) {
    return { value: null, state: 'miss' };
  }

  const age = (Date.now() - entry.storedAt) / 1000;
  if (age <= freshTTL) {
    return { value: entry.value, state: 'fresh' };
  }
  return { value: entry.value, state: 'stale' };
}

function setEntry(key, value, { freshTTL = FRESH_TTL, staleTTL = STALE_TTL } = {}) {
  cache.set(key, { value, storedAt: Date.now() }, freshTTL + staleTTL);
}

// Underlying node-cache stats, for /api/health.
function getStats() {
  return cache.getStats();
}

module.exports = { getEntry, setEntry, getStats, FRESH_TTL, STALE_TTL };
