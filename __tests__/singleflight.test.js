/**
 * Single-flight / dedup tests
 */

const singleflight = require('../lib/singleflight');

describe('singleflight', () => {
  it('runs the function only once for concurrent identical keys', async () => {
    let calls = 0;
    const fn = () =>
      new Promise((resolve) => {
        calls += 1;
        setTimeout(() => resolve('result'), 30);
      });

    const [a, b, c] = await Promise.all([
      singleflight.run('k', fn),
      singleflight.run('k', fn),
      singleflight.run('k', fn),
    ]);

    expect(calls).toBe(1);
    expect(a).toBe('result');
    expect(b).toBe('result');
    expect(c).toBe('result');
    expect(singleflight.size()).toBe(0);
  });

  it('runs separately for different keys', async () => {
    let calls = 0;
    const fn = () => Promise.resolve(++calls);
    await Promise.all([singleflight.run('a', fn), singleflight.run('b', fn)]);
    expect(calls).toBe(2);
  });

  it('allows a new run after the previous one settles', async () => {
    let calls = 0;
    const fn = () => Promise.resolve(++calls);
    await singleflight.run('seq', fn);
    await singleflight.run('seq', fn);
    expect(calls).toBe(2);
  });

  it('clears in-flight entry even when the function rejects', async () => {
    const fn = () => Promise.reject(new Error('boom'));
    await expect(singleflight.run('err', fn)).rejects.toThrow('boom');
    expect(singleflight.size()).toBe(0);
  });
});
