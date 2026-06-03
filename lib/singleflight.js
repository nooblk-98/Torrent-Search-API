/**
 * Single-flight / request deduplication
 *
 * Ensures that concurrent calls for the same key share a single in-flight
 * promise instead of each triggering its own (expensive) scrape. Prevents
 * cache stampedes: 50 simultaneous searches for "ubuntu" run one scrape.
 */

const inflight = new Map();

/**
 * Run `fn` for `key`, deduplicating concurrent calls.
 * @param {string} key Unique identifier for the work being done
 * @param {() => Promise<any>} fn Function producing the result
 * @returns {Promise<any>}
 */
function run(key, fn) {
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Number of in-flight operations (used by health/metrics). */
function size() {
  return inflight.size;
}

module.exports = { run, size };
