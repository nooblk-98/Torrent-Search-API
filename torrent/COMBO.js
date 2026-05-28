const logger = require('../lib/logger');
let torrents = require("./torrents")();

/**
 * Combo search with parallel provider requests and error handling
 * Uses Promise.allSettled to handle partial failures
 */
async function combo(query, page) {
    const comboTorrent = [];
    const providerNames = Object.keys(torrents);
    const providerResults = [];

    logger.info('Starting combo search', { query, page, providers: providerNames.length });

    // Create array of provider promises with individual error handling
    const providerPromises = providerNames.map(async (name) => {
        const startTime = Date.now();
        try {
            const results = await torrents[name](query, page);
            const duration = Date.now() - startTime;

            providerResults.push({
                name,
                status: 'fulfilled',
                resultCount: results?.length || 0,
                duration,
            });

            return { name, results: results || [] };
        } catch (err) {
            const duration = Date.now() - startTime;
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

    // Wait for all providers (fulfilled or rejected)
    const settled = await Promise.allSettled(providerPromises);

    // Aggregate results
    let totalResults = 0;
    let successCount = 0;
    let failCount = 0;

    for (const settlement of settled) {
        if (settlement.status === 'fulfilled') {
            const { name, results } = settlement.value;
            if (results && results.length > 0) {
                // Add provider metadata to each result
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