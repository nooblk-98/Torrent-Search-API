/**
 * Provider health + circuit breaker tests
 */

const providerHealth = require('../lib/providerHealth');

describe('providerHealth', () => {
  beforeEach(() => providerHealth.reset());

  it('records successes and computes success rate', () => {
    providerHealth.recordSuccess('p', 100);
    providerHealth.recordSuccess('p', 120);
    const snap = providerHealth.snapshot();
    expect(snap.p.successes).toBe(2);
    expect(snap.p.failures).toBe(0);
    expect(snap.p.successRate).toBe(1);
    expect(snap.p.status).toBe('up');
  });

  it('records failures and tracks consecutive count', () => {
    providerHealth.recordFailure('p', 'timeout', 50);
    providerHealth.recordFailure('p', 'timeout', 50);
    const snap = providerHealth.snapshot();
    expect(snap.p.failures).toBe(2);
    expect(snap.p.consecutiveFailures).toBe(2);
    expect(snap.p.lastError).toBe('timeout');
  });

  it('resets consecutive failures on success', () => {
    providerHealth.recordFailure('p', 'x');
    providerHealth.recordSuccess('p', 10);
    expect(providerHealth.snapshot().p.consecutiveFailures).toBe(0);
  });

  it('opens the circuit after the failure threshold', () => {
    expect(providerHealth.isOpen('p')).toBe(false);
    for (let i = 0; i < providerHealth.FAILURE_THRESHOLD; i++) {
      providerHealth.recordFailure('p', 'fail');
    }
    expect(providerHealth.isOpen('p')).toBe(true);
    expect(providerHealth.snapshot().p.status).toBe('circuit-open');
  });

  it('half-opens the circuit after cooldown', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      for (let i = 0; i < providerHealth.FAILURE_THRESHOLD; i++) {
        providerHealth.recordFailure('p', 'fail');
      }
      expect(providerHealth.isOpen('p')).toBe(true);
      now += providerHealth.COOLDOWN_MS + 1;
      // After cooldown the circuit half-opens (allows a trial through).
      expect(providerHealth.isOpen('p')).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });
});
