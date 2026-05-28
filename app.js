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
        const resp = await axios.get(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`, { timeout: 5000 });
        // Response: ["query", ["suggestion1", "suggestion2", ...]]
        const suggestions = (resp.data[1] || []).slice(0, 8);
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
