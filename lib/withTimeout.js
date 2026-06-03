/**
 * Wrap a promise so it rejects if it doesn't settle within `ms`.
 * Used so one slow/hanging provider can't stall a combo search.
 */
function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = withTimeout;
