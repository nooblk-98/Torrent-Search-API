/**
 * withTimeout tests
 */

const withTimeout = require('../lib/withTimeout');

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    const p = new Promise((r) => setTimeout(() => r('ok'), 10));
    await expect(withTimeout(p, 100, 'fast')).resolves.toBe('ok');
  });

  it('rejects when the promise exceeds the timeout', async () => {
    const p = new Promise((r) => setTimeout(() => r('late'), 100));
    await expect(withTimeout(p, 20, 'slow')).rejects.toThrow(/slow timed out after 20ms/);
  });

  it('propagates the underlying rejection', async () => {
    const p = Promise.reject(new Error('inner'));
    await expect(withTimeout(p, 100, 'x')).rejects.toThrow('inner');
  });
});
