const cheerio = require('cheerio');
const request = require('./request');

async function torrentDownloads(query, page = '1') {
    const allTorrent = [];
    const url = `https://www.torrentdownloads.pro/search/?search=${encodeURIComponent(query)}&page=${page}`;
    let html;
    try {
        html = await request(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
    } catch {
        return null;
    }

    const $ = cheerio.load(html.data);

    const rows = $('.grey_bar3').toArray();

    // First 4 rows are ads/header blocks — skip them
    const resultRows = rows.slice(4);

    await Promise.all(resultRows.map(async (el) => {
        const $el = $(el);

        // Skip sub-headers (no torrent link)
        const linkEl = $el.find('a[href^="/torrent/"]').first();
        if (!linkEl.length) return;

        const href = linkEl.attr('href');
        // Skip comment anchors
        if (href.includes('#')) return;

        const name = linkEl.attr('title')?.replace('View torrent info : ', '').trim()
            || linkEl.text().trim();

        const spans = $el.find('span:not(.health):not(.check_box):not(.cloud)').map((_, s) => $(s).text().trim()).get();
        // span order: leech, seeds, size
        const leechers = spans[0] || '';
        const seeders = spans[1] || '';
        const size = (spans[2] || '').replace(/ /g, ' ');

        const detailUrl = 'https://www.torrentdownloads.pro' + href;

        let magnet = '';
        let torrentLink = '';
        try {
            const detail = await request(detailUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.torrentdownloads.pro/'
                }
            });
            const $d = cheerio.load(detail.data);
            magnet = $d('a[href^="magnet:"]').attr('href') || '';
            torrentLink = $d('a[href$=".torrent"]').first().attr('href') || '';
        } catch {
            // continue without magnet
        }

        if (name) {
            allTorrent.push({ Name: name, Size: size, Seeders: seeders, Leechers: leechers, Magnet: magnet, Torrent: torrentLink, Url: detailUrl });
        }
    }));

    return allTorrent;
}

torrentDownloads.customName = 'torrentdownloads';
module.exports = torrentDownloads;
