const cheerio = require('cheerio')
const request = require('./request')

async function bitSearch(query, page = '1') {
    var ALLTORRENT = [];
    const url = "https://bitsearch.to/search?q=" + query + "&page=" + page + "&sort=seeders";
    let html;
    try {
        html = await request(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
    } catch {
        return null;
    }

    const $ = cheerio.load(html.data);

    $('h3 a[href^="/torrent/"]').each((_, element) => {
        const $card = $(element).closest('.bg-white');

        const $meta = $card.find('.flex-wrap.mb-3 .inline-flex');
        const $stats = $card.find('.gap-4.text-sm');

        let torrent = {
            'Name': $(element).text().trim(),
            'Size': $meta.eq(1).find('span').last().text().trim(),
            'DateUploaded': $meta.eq(2).find('span').last().text().trim(),
            'Seeders': $stats.find('.text-green-600 .font-medium').text().trim(),
            'Leechers': $stats.find('.text-red-600 .font-medium').text().trim(),
            'Downloads': $stats.find('.text-blue-600 .font-medium').text().trim(),
            'Url': "https://bitsearch.to" + $(element).attr('href'),
            'TorrentLink': $card.find('a[href^="/download/"]').attr('href'),
            'Magnet': $card.find('a[href^="magnet:"]').attr('href'),
        }
        ALLTORRENT.push(torrent);
    })

    return ALLTORRENT;
}

module.exports = bitSearch;
