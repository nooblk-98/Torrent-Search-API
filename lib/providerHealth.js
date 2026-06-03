/**
 * Per-provider health tracking + circuit breaker
 *
 * Torrent sites change their HTML and silently break scrapers. This module
 * records each provider's success/failure history so /api/health can surface
 * which providers are actually working, and a simple circuit breaker skips
 * providers that are failing repeatedly (until a cooldown elapses).
 */

const config = require('../config');

const breaker = config.circuitBreaker || {};
const FAILURE_THRESHOLD = breaker.failureThreshold ?? 5;
const COOLDOWN_MS = breaker.cooldownMs ?? 60000;

// name -> { successes, failures, consecutiveFailures, lastError, lastDurationMs,
//           openedAt, lastStatus, lastCheckedAt }
const stats = new Map();

function ensure(name) {
  if (!stats.has(name)) {
    stats.set(name, {
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
      lastError: null,
      lastDurationMs: null,
      openedAt: null,
      lastStatus: 'unknown',
      lastCheckedAt: null,
    });
  }
  return stats.get(name);
}

function recordSuccess(name, durationMs) {
  const s = ensure(name);
  s.successes += 1;
  s.consecutiveFailures = 0;
  s.lastError = null;
  s.lastDurationMs = durationMs ?? null;
  s.openedAt = null;
  s.lastStatus = 'up';
  s.lastCheckedAt = Date.now();
}

function recordFailure(name, error, durationMs) {
  const s = ensure(name);
  s.failures += 1;
  s.consecutiveFailures += 1;
  s.lastError = error ? String(error) : 'unknown error';
  s.lastDurationMs = durationMs ?? null;
  s.lastStatus = 'down';
  s.lastCheckedAt = Date.now();

  if (s.consecutiveFailures >= FAILURE_THRESHOLD && !s.openedAt) {
    s.openedAt = Date.now();
  }
}

/**
 * Whether the circuit is open (provider should be skipped right now).
 * The circuit half-opens after the cooldown so the provider gets retried.
 */
function isOpen(name) {
  const s = stats.get(name);
  if (!s || !s.openedAt) return false;

  if (Date.now() - s.openedAt >= COOLDOWN_MS) {
    // Half-open: allow one trial request through by clearing the open state.
    s.openedAt = null;
    s.consecutiveFailures = 0;
    return false;
  }
  return true;
}

/** Snapshot of all provider health, for /api/health. */
function snapshot() {
  const out = {};
  for (const [name, s] of stats.entries()) {
    const total = s.successes + s.failures;
    out[name] = {
      status: s.openedAt ? 'circuit-open' : s.lastStatus,
      successRate: total > 0 ? Number((s.successes / total).toFixed(3)) : null,
      successes: s.successes,
      failures: s.failures,
      consecutiveFailures: s.consecutiveFailures,
      lastDurationMs: s.lastDurationMs,
      lastError: s.lastError,
      lastCheckedAt: s.lastCheckedAt ? new Date(s.lastCheckedAt).toISOString() : null,
    };
  }
  return out;
}

/** Reset all stats (used by tests). */
function reset() {
  stats.clear();
}

module.exports = {
  recordSuccess,
  recordFailure,
  isOpen,
  snapshot,
  reset,
  FAILURE_THRESHOLD,
  COOLDOWN_MS,
};
