const path = require('path');
const fs = require('fs');
const logger = require('../lib/logger');

// Known broken/discontinued providers to ignore
let ignored = [
    'torrents.js',
    'COMBO.js',
    'request.js',
    'ettv.js',        // Site discontinued
    'rarbg.js',       // RARBG shut down in May 2023
    'eztv.js',        // Often unreliable
];

function getTorrents() {
    let torrentFiles;
    try {
        torrentFiles = fs.readdirSync(__dirname).filter((v) => !ignored.includes(v));
    } catch (err) {
        logger.error('Failed to read torrent directory', { error: err.message });
        return {};
    }

    const torrents = {};
    const failed = [];

    for (let torrentFile of torrentFiles) {
        // Only load .js files
        if (!torrentFile.endsWith('.js')) continue;

        try {
            let torrent = require(`./${torrentFile}`);

            // Skip if not a function
            if (typeof torrent !== 'function') {
                logger.warn('Skipping non-function export', { file: torrentFile });
                continue;
            }

            let torrentName = (torrent?.customName ?? torrentFile.split('.').shift()).toLowerCase();

            // Validate name
            if (!/^[a-z0-9_-]+$/.test(torrentName)) {
                logger.warn('Invalid provider name, skipping', { file: torrentFile, name: torrentName });
                continue;
            }

            torrents[torrentName] = torrent;
            logger.debug('Loaded provider', { name: torrentName, file: torrentFile });
        } catch (err) {
            failed.push({ file: torrentFile, error: err.message });
            logger.error('Failed to load provider', { file: torrentFile, error: err.message });
        }
    }

    if (failed.length > 0) {
        logger.warn('Some providers failed to load', { failed });
    }

    logger.info('Provider loader completed', {
        loaded: Object.keys(torrents).length,
        failed: failed.length,
    });

    return torrents;
}

module.exports = getTorrents;