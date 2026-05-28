const cheerio = require('cheerio');
const request = require('./request');

async function torrent1337x(query = '', page = '1') {
    const allTorrent = [];
    let html;
    const url = 'https://1337xx.to/search/' + query + '/' + page + '/';
    try {
        html = await request(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://1337xx.to/'
            }
        });
    } catch {
        return null;
    }

    const $ = cheerio.load(html.data)

    const links = $('td.name').map((_, element) => {
        var link = 'https://1337xx.to' + $(element).find('a').next().attr('href');
        return link;
    }).get();

    await Promise.all(links.map(async (element) => {
        const data = {};
        const labels = ['Category', 'Type', 'Language', 'Size', 'UploadedBy', 'Downloads', 'LastChecked', 'DateUploaded', 'Seeders', 'Leechers'];
        let html;
        try {
            html = await request(element, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://1337xx.to/'
                }
            });
        } catch {
            return null;
        }
        const $ = cheerio.load(html.data);
        data.Name = $('.box-info-heading h1').text().trim();
        data.Magnet = $('a[href^="magnet:"]').attr('href') || "";

        const poster = $('.torrent-image img').attr('src');

        if (typeof poster !== 'undefined') {
            if (poster && poster.startsWith('http')) {
                data.Poster = poster;
            }
            else if (poster) {
                data.Poster = 'https:' + poster;
            }
        } else {
            data.Poster = ''
        }

        $('div .clearfix ul li > span').each((i, element) => {
            $list = $(element);
            data[labels[i]] = $list.text();
        })
        data.Url = element

        allTorrent.push(data)
    }))

    return allTorrent
}
torrent1337x.customName = "1337x"
module.exports = torrent1337x
