const axios = require('axios');

const FS_URL = process.env.FLARESOLVERR_URL || 'http://flaresolverr:8191/v1';
const TIMEOUT = 30000;

async function request(url, config = {}) {
    try {
        return await axios.get(url, { ...config, timeout: TIMEOUT });
    } catch (err) {
        if (!process.env.USE_FLARESOLVERR && !process.env.FLARESOLVERR_URL) {
            throw err;
        }
        try {
            const resp = await axios.post(FS_URL, {
                cmd: 'request.get',
                url,
                maxTimeout: 60000,
            }, { timeout: 65000 });
            return { data: resp.data.solution.response };
        } catch {
            throw err;
        }
    }
}

module.exports = request;
