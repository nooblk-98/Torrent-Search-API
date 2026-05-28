const cheerio = require('cheerio')
const request = require('./request')

async function torrentFunk(query, page = '1') {
    var ALLTORRENT = [];
    var ALLURL = [];
    const url = `https://en.torrentfunk-official.live/all/torrents/${query}.html`;
    let html;
    try {
        html = await request(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36"
            }
        });

    } catch {
        return null;
    }

    const $ = cheerio.load(html.data);

    $('.tmain tbody tr').each((i, element) => {

        if (i > 4) {
            let url = "https://en.torrentfunk-official.live" + $(element).find('td').eq(0).find('a').attr('href');
            ALLURL.push(url);
            let torrent = {
                'Name': $(element).find('td').eq(0).find('a').text().trim(),
                'Size': $(element).find('td').eq(2).text(),
                'DateUploaded': $(element).find('td').eq(1).text(),
                'Uploader': $(element).find('td').eq(5).text(),
                'Seeders': $(element).find('td').eq(3).text(),
                'Leechers': $(element).find('td').eq(4).text(),
                'Url': url
            }
            if (torrent.Name !== '') {
                ALLTORRENT.push(torrent);
            }
        }
    })

    await Promise.all(ALLURL.map(async url => {
        for (let i = 0; i < ALLTORRENT.length; i++) {
            if (ALLTORRENT[i]['Url'] === url) {
                let html;
                try {
                    html = await request(url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36"
                        }
                    });
                } catch {
                    return;
                }
                const $ = cheerio.load(html.data);
                ALLTORRENT[i].Torrent = "https://en.torrentfunk-official.live" + $('#right > main > div.content > table:nth-child(3) > tbody > tr > td:nth-child(2) > a').attr('href');

            }
        }

    }))

    return ALLTORRENT;
}
module.exports = torrentFunk;