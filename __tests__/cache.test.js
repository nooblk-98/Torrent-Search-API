/**
 * Cache Tests
 */

const cache = require('../lib/cache');

describe('Cache', () => {
  afterEach(() => {
    cache.flushAll();
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should handle objects', () => {
    const obj = { name: 'test', data: [1, 2, 3] };
    cache.set('key2', obj);
    expect(cache.get('key2')).toEqual(obj);
  });

  it('should expire keys after TTL', (done) => {
    cache.set('key3', 'value3', 1); // 1 second TTL
    expect(cache.get('key3')).toBe('value3');

    setTimeout(() => {
      expect(cache.get('key3')).toBeUndefined();
      done();
    }, 1500);
  });

  it('should provide stats', () => {
    cache.set('key4', 'value4');
    cache.get('key4'); // hit
    cache.get('key5'); // miss

    const stats = cache.getStats();
    expect(stats.keys).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should flush all keys', () => {
    cache.set('key6', 'value6');
    cache.set('key7', 'value7');
    cache.flushAll();
    expect(cache.get('key6')).toBeUndefined();
    expect(cache.get('key7')).toBeUndefined();
    expect(cache.getStats().keys).toBe(0);
  });
});
