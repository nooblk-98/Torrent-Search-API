const express = require('express');
const axios = require('axios');
const combo = require("./torrent/COMBO")
const path = require('path');

let torrents = require("./torrent/torrents")()

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/:website/:query/:page?', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    let website = (req.params.website).toLowerCase();
    let query = req.params.query;
    let page = req.params.page;

    if (website == "all") {
        combo(query, page).then(v => {
            console.log(v)
            res.json(v)
        })
    } else if (torrents[website]) {
        torrents[website](query, page).then((v) => {
            console.log(v)
            res.json(v)
        })
    } else {
        res.json({
            error: `Please select "${Object.keys(torrents).join(" | ")}"`
        })
    }
});

app.get("/api/torrents", (req, res) => {
    res.json(Object.keys(torrents))
})

app.get("/api/suggest", async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    try {
        const resp = await axios.get(`https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=0`, { timeout: 5000 });
        const seen = new Set();
        const suggestions = [];
        for (const item of resp.data) {
            if (!item.name || item.name === 'No results returned') continue;
            const label = item.name.split(' ').slice(0, 5).join(' ');
            if (!seen.has(label.toLowerCase())) {
                seen.add(label.toLowerCase());
                suggestions.push(label);
            }
            if (suggestions.length >= 8) break;
        }
        res.json(suggestions);
    } catch {
        res.json([]);
    }
})

app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
console.log('Listening on PORT : ', PORT);
app.listen(PORT);
