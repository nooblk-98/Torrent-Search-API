const axios = require('axios');

const FS_URL = process.env.FLARESOLVERR_URL || 'http://flaresolverr:8191/v1';
const TIMEOUT = 30000;

function isJsChallenge(html) {
    if (typeof html !== 'string') return false;
    return html.includes('<title>Just a moment...</title>') ||
        html.includes('cf-browser-verification') ||
        html.includes('checking your browser') ||
        (html.includes('<title>Loading...</title>') && html.includes('window.location.replace'));
}

async function requestViaFlareSolverr(url) {
    const resp = await axios.post(FS_URL, {
        cmd: 'request.get',
        url,
        maxTimeout: 60000,
    }, { timeout: 65000 });
    return { data: resp.data.solution.response };
}

async function request(url, config = {}) {
    const useFlareSolverr = process.env.USE_FLARESOLVERR || process.env.FLARESOLVERR_URL;
    try {
        const response = await axios.get(url, { ...config, timeout: TIMEOUT });
        if (useFlareSolverr && isJsChallenge(response.data)) {
            return await requestViaFlareSolverr(url);
        }
        return response;
    } catch (err) {
        if (!useFlareSolverr) throw err;
        try {
            return await requestViaFlareSolverr(url);
        } catch {
            throw err;
        }
    }
}

module.exports = request;
