/**
 * Centralized Configuration
 */

const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // FlareSolverr
  flaresolverr: {
    enabled: process.env.USE_FLARESOLVERR === 'true' || !!process.env.FLARESOLVERR_URL,
    url: process.env.FLARESOLVERR_URL || 'http://flaresolverr:8191/v1',
    timeout: 65000,
    maxTimeout: 60000,
  },

  // Request
  request: {
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },

  // Cache
  cache: {
    stdTTL: 300, // 5 minutes default
    checkperiod: 60, // check for expired keys every 60 seconds
    maxKeys: 1000,
    // Stale-while-revalidate: how long (seconds) a cached entry remains
    // servable as "stale" after its fresh TTL expires, while a background
    // refresh runs. Total lifetime of a key ≈ stdTTL + staleTTL.
    staleTTL: 600,
  },

  // Providers
  providers: {
    timeout: 30000,
    maxConcurrent: 5,
    // Per-provider hard timeout inside a combo search (ms). One dead site
    // shouldn't block the whole response.
    perProviderTimeout: parseInt(process.env.PROVIDER_TIMEOUT || '8000', 10),
  },

  // Circuit breaker (per provider)
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD || '5', 10),
    cooldownMs: parseInt(process.env.CB_COOLDOWN_MS || '60000', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.NODE_ENV !== 'test',
  },
};

module.exports = config;
