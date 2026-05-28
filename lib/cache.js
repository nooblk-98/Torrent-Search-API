/**
 * Cache Utility using node-cache
 */

const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('./logger');

const cache = new NodeCache({
  stdTTL: config.cache.stdTTL,
  checkperiod: config.cache.checkperiod,
  maxKeys: config.cache.maxKeys,
  useClones: true,
  deleteOnExpire: true,
});

cache.on('expired', (key, value) => {
  logger.debug('Cache key expired', { key });
});

cache.on('flush', () => {
  logger.debug('Cache flushed');
});

module.exports = cache;
