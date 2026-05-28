const axios = require('axios');
const config = require('../config');
const logger = require('../lib/logger');

const FS_URL = config.flaresolverr.url;
const TIMEOUT = config.request.timeout;
const MAX_RETRIES = config.request.retries;
const RETRY_DELAY = config.request.retryDelay;

function isJsChallenge(html) {
    if (typeof html !== 'string') return false;
    return html.includes('<title>Just a moment...</title>') ||
        html.includes('cf-browser-verification') ||
        html.includes('checking your browser') ||
        (html.includes('<title>Loading...</title>') && html.includes('window.location.replace'));
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestViaFlareSolverr(url, headers = {}) {
    logger.debug('Using FlareSolverr for request', { url });
    const resp = await axios.post(FS_URL, {
        cmd: 'request.get',
        url,
        maxTimeout: config.flaresolverr.maxTimeout,
        headers: headers['User-Agent'] ? { 'User-Agent': headers['User-Agent'] } : undefined,
    }, { timeout: config.flaresolverr.timeout });

    if (!resp.data?.solution?.response) {
        throw new Error('FlareSolverr returned invalid response');
    }

    return { data: resp.data.solution.response };
}

async function requestWithRetry(url, config = {}, attempt = 1) {
    try {
        const response = await axios.get(url, { ...config, timeout: TIMEOUT });
        return response;
    } catch (err) {
        if (attempt >= MAX_RETRIES) throw err;

        // Only retry on network errors or 5xx responses
        const shouldRetry = !err.response || err.response.status >= 500;
        if (!shouldRetry) throw err;

        logger.warn(`Request failed, retrying (${attempt}/${MAX_RETRIES})`, {
            url,
            error: err.message,
        });

        await sleep(RETRY_DELAY * attempt);
        return requestWithRetry(url, config, attempt + 1);
    }
}

async function request(url, axiosConfig = {}) {
    const useFlareSolverr = config.flaresolverr.enabled;

    try {
        const response = await requestWithRetry(url, axiosConfig);

        if (useFlareSolverr && isJsChallenge(response.data)) {
            logger.debug('Cloudflare challenge detected, using FlareSolverr', { url });
            return await requestViaFlareSolverr(url, axiosConfig.headers);
        }

        return response;
    } catch (err) {
        if (!useFlareSolverr) {
            logger.error('Request failed', { url, error: err.message, code: err.code });
            throw err;
        }

        // Try FlareSolverr as fallback
        try {
            return await requestViaFlareSolverr(url, axiosConfig.headers);
        } catch (fsErr) {
            logger.error('FlareSolverr fallback failed', { url, error: fsErr.message });
            throw err; // Throw original error
        }
    }
}

module.exports = request;
