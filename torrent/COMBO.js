const logger = require('../lib/logger');
const config = require('../config');
const withTimeout = require('../lib/withTimeout');
const providerHealth = require('../lib/providerHealth');
const torrents = require("./torrents")();

/**
 * Combo search with parallel provider requests, per-provider timeout,
 * circuit breaking and health tracking.
 *
 * - Uses Promise.allSettled so one provider's failure never fails the batch.
 * - Each provider is wrapped in a hard timeout so a hanging site can't stall
 *   the whole response.
 * - Providers whose circuit is open (repeated recent failures) are skipped.
 */
async function combo(query, page) {
  const comboTorrent = [];
  const providerNames = Object.keys(torrents);
  const providerResults = [];
  const perProviderTimeout = config.providers.perProviderTimeout;

  logger.info('Starting combo search', { query, page, providers: providerNames.length });

  const providerPromises = providerNames.map(async (name) => {
    // Skip providers with an open circuit (failing repeatedly).
    if (providerHealth.isOpen(name)) {
      providerResults.push({ name, status: 'skipped', reason: 'circuit-open' });
      return { name, results: [] };
    }

    const startTime = Date.now();
    try {
      const results = await withTimeout(
        Promise.resolve(torrents[name](query, page)),
        perProviderTimeout,
        `provider:${name}`
      );
      const duration = Date.now() - startTime;

      providerHealth.recordSuccess(name, duration);
      providerResults.push({
        name,
        status: 'fulfilled',
        resultCount: results?.length || 0,
        duration,
      });

      return { name, results: results || [] };
    } catch (err) {
      const duration = Date.now() - startTime;
      providerHealth.recordFailure(name, err.message, duration);
      logger.warn('Provider failed', { provider: name, error: err.message, duration });

      providerResults.push({
        name,
        status: 'rejected',
        error: err.message,
        duration,
      });

      return { name, results: [] };
    }
  });

  const settled = await Promise.allSettled(providerPromises);

  let totalResults = 0;
  let successCount = 0;
  let failCount = 0;

  for (const settlement of settled) {
    if (settlement.status === 'fulfilled') {
      const { name, results } = settlement.value;
      if (results && results.length > 0) {
        const resultsWithSource = results.map(r => ({
          ...r,
          _source: name,
        }));
        comboTorrent.push(...resultsWithSource);
        totalResults += results.length;
      }
      successCount++;
    } else {
      failCount++;
    }
  }

  logger.info('Combo search completed', {
    query,
    page,
    totalResults,
    providersSucceeded: successCount,
    providersFailed: failCount,
    providerDetails: providerResults,
  });

  return comboTorrent;
}

module.exports = combo;
