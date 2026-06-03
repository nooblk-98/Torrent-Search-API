/**
 * Stale-while-revalidate cache tests
 */

const swrCache = require('../lib/swrCache');
const cache = require('../lib/cache');

describe('swrCache', () => {
  const realNow = Date.now;
  let now;

  beforeEach(() => {
    cache.flushAll();
    now = 1_000_000_000;
    Date.now = () => now;
  });

  afterEach(() => {
    Date.now = realNow;
  });

  it('returns miss for an unknown key', () => {
    expect(swrCache.getEntry('nope')).toEqual({ value: null, state: 'miss' });
  });

  it('returns fresh within the fresh TTL', () => {
    swrCache.setEntry('k', [1, 2, 3], { freshTTL: 60, staleTTL: 60 });
    now += 30 * 1000;
    const res = swrCache.getEntry('k', { freshTTL: 60 });
    expect(res.state).toBe('fresh');
    expect(res.value).toEqual([1, 2, 3]);
  });

  it('returns stale after the fresh TTL but before eviction', () => {
    swrCache.setEntry('k', ['x'], { freshTTL: 60, staleTTL: 600 });
    now += 120 * 1000; // past fresh, within fresh+stale
    const res = swrCache.getEntry('k', { freshTTL: 60 });
    expect(res.state).toBe('stale');
    expect(res.value).toEqual(['x']);
  });
});
