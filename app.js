const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const combo = require('./torrent/COMBO');
const config = require('./config');
const logger = require('./lib/logger');
const cache = require('./lib/cache');
const { searchParamsSchema, suggestionParamsSchema } = require('./lib/validation');

const path = require('path');
let torrents = require('./torrent/torrents')();

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            scriptSrc: ["'self'", 'https://code.jquery.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: { error: config.rateLimit.message },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS middleware
app.use('/api/', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.cors.origin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
if (config.logging.enableRequestLogging) {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            logger.info('Request completed', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: Date.now() - start,
                ip: req.ip,
            });
        });
        next();
    });
}

// Swagger documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Torrent Search API',
            version: '2.0.0',
            description: 'A secure REST API for searching torrents across multiple providers',
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Local server',
            },
        ],
    },
    apis: ['./app.js'],
};
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Service health status
 */
app.get('/api/health', async (req, res) => {
    const providerNames = Object.keys(torrents);
    const cacheStats = cache.getStats();

    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.0',
        uptime: process.uptime(),
        providers: {
            available: providerNames,
            count: providerNames.length,
        },
        cache: {
            keys: cacheStats.keys,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
        },
        environment: config.nodeEnv,
    });
});

/**
 * @openapi
 * /api/torrents:
 *   get:
 *     summary: List available providers
 *     responses:
 *       200:
 *         description: Array of provider names
 */
app.get('/api/torrents', (req, res) => {
    res.json(Object.keys(torrents));
});

/**
 * @openapi
 * /api/suggest:
 *   get:
 *     summary: Get search suggestions
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Array of suggestions
 */
app.get('/api/suggest', async (req, res) => {
    // Validate input
    const validation = suggestionParamsSchema.safeParse({ q: req.query.q });
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid query parameter', details: validation.error.errors });
    }

    const { q } = validation.data;
    const cacheKey = `suggest:${q}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    try {
        const resp = await axios.get(
            `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`,
            { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36' } }
        );
        const suggestions = (resp.data[1] || []).slice(0, 8);

        // Cache for 1 hour
        cache.set(cacheKey, suggestions, 3600);
        res.json(suggestions);
    } catch (err) {
        logger.warn('Suggestions fetch failed', { query: q, error: err.message });
        res.json([]);
    }
});

/**
 * @openapi
 * /api/{provider}/{query}/{page}:
 *   get:
 *     summary: Search torrents by provider
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider name or 'all'
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: path
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Array of torrent results
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Provider not found
 */
app.get('/api/:provider/:query/:page?', async (req, res) => {
    // Validate parameters
    const validation = searchParamsSchema.safeParse({
        provider: req.params.provider,
        query: req.params.query,
        page: req.params.page,
    });

    if (!validation.success) {
        return res.status(400).json({
            error: 'Invalid parameters',
            details: validation.error.errors,
        });
    }

    const { provider, query, page } = validation.data;
    const cacheKey = `search:${provider}:${query}:${page}`;

    // Check cache (skip cache for development if needed)
    const cached = cache.get(cacheKey);
    if (cached && config.nodeEnv !== 'development') {
        logger.debug('Cache hit', { cacheKey });
        return res.json(cached);
    }

    try {
        let results;

        if (provider === 'all') {
            results = await combo(query, String(page));
        } else if (torrents[provider]) {
            results = await torrents[provider](query, String(page));
        } else {
            const availableProviders = Object.keys(torrents);
            return res.status(404).json({
                error: `Provider "${provider}" not found`,
                availableProviders,
            });
        }

        // Filter out invalid results
        const validResults = Array.isArray(results)
            ? results.filter(r => r && r.Name && r.Name.trim() !== '')
            : [];

        // Cache results (5 minutes TTL)
        cache.set(cacheKey, validResults);

        res.json(validResults);
    } catch (err) {
        logger.error('Search failed', {
            provider,
            query,
            page,
            error: err.message,
            stack: config.nodeEnv === 'development' ? err.stack : undefined,
        });

        res.status(500).json({
            error: 'Search failed',
            message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
        });
    }
});

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
    });
    res.status(500).json({ error: 'Internal server error' });
});

// Start server only if not in test mode
let server;
if (config.nodeEnv !== 'test') {
    server = app.listen(config.port, () => {
        logger.info('Server started', {
            port: config.port,
            environment: config.nodeEnv,
            providers: Object.keys(torrents),
        });
    });

    // Graceful shutdown
    function gracefulShutdown(signal) {
        logger.info(`${signal} received, shutting down gracefully`);

        server.close(() => {
            logger.info('HTTP server closed');
            cache.close();
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error('Forced shutdown');
            process.exit(1);
        }, 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', { error: err.message, stack: err.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection', { reason, promise });
    });
}

module.exports = { app, server };
