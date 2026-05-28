# Torrent Search API

A self-hosted REST API and web UI for searching torrents across multiple providers simultaneously. Built with Node.js and Express, with optional Cloudflare bypass via FlareSolverr.

[![Node.js](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?style=flat-square)](Dockerfile)

## Features

- Search torrents across 11 providers from a single API
- **Combo search** — query all providers in parallel and merge results
- Built-in web UI with provider selector, pagination, and magnet links
- Automatic Cloudflare JS challenge bypass via [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)
- Docker Compose setup with FlareSolverr bundled
- Dynamic provider loading — add or remove scrapers by dropping files into `torrent/`

## Providers

| Provider | Keyword |
|---|---|
| 1337x | `1337x` |
| BitSearch | `bitsearch` |
| EZTV | `eztv` |
| GloDLS | `glodls` |
| LimeTorrents | `limetorrent` |
| Nyaa.si | `nyaasi` |
| The Pirate Bay | `piratebay` |
| RARBG | `rarbg` |
| TorrentDownloads | `torrentdownloads` |
| TorrentProject | `torrentproject` |
| YTS | `yts` |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [Docker](https://www.docker.com) (optional)

### Run locally

```bash
git clone https://github.com/NoobLk/Torrent-Search-API.git
cd Torrent-Search-API
npm install
node app.js
```

The server starts on `http://localhost:3001`.

### Run with Docker Compose

The recommended approach — starts the API and FlareSolverr together:

```bash
docker compose up -d
```

> [!NOTE]
> FlareSolverr is required to bypass Cloudflare protection on providers like 1337x and GloDLS. Without it, those providers may return empty results.

## API Reference

### List providers

```
GET /api/torrents
```

Returns an array of available provider keywords.

### Search a provider

```
GET /api/search/:provider/:query/:page?
```

| Parameter | Description |
|---|---|
| `provider` | Provider keyword (see table above) |
| `query` | Search term |
| `page` | Page number (optional, default: `1`) |

**Example:**

```
GET /api/search/1337x/ubuntu/1
```

### Combo search

Queries all providers in parallel and returns merged results:

```
GET /api/search/combo/:query/:page?
```

### Response format

```json
[
  {
    "Name": "Ubuntu 24.04 LTS Desktop amd64",
    "Size": "5.8 GB",
    "Seeders": "1200",
    "Leechers": "300",
    "DateUploaded": "2024-04-25",
    "Magnet": "magnet:?xt=...",
    "Url": "https://1337x.to/torrent/...",
    "UploadedBy": "ubuntu"
  }
]
```

> [!TIP]
> Field availability varies by provider. Always handle `null` or missing fields in your client.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the server listens on |
| `USE_FLARESOLVERR` | — | Set to `true` to route all requests through FlareSolverr |
| `FLARESOLVERR_URL` | `http://flaresolverr:8191/v1` | FlareSolverr endpoint |

Setting `FLARESOLVERR_URL` implicitly enables FlareSolverr — `USE_FLARESOLVERR` is not required separately.

## Web UI

Opening `http://localhost:3001` loads the built-in search interface. Select a provider (or **combo** for all), enter a query, and browse results with direct magnet link support.

## Adding a Provider

Create a file in `torrent/` that exports an async function:

```js
async function myProvider(query, page = '1') {
    // scrape results and return an array of objects
}

module.exports = myProvider;
```

The file name (without `.js`) is used as the provider keyword automatically. Override it with:

```js
module.exports.customName = 'my-provider';
```

## Project Structure

```
├── app.js                  # Express server and routes
├── public/
│   └── index.html          # Web UI
├── torrent/
│   ├── torrents.js         # Dynamic provider loader
│   ├── COMBO.js            # Parallel multi-provider search
│   ├── request.js          # HTTP client with FlareSolverr fallback
│   └── *.js                # Provider scrapers
├── Dockerfile
└── docker-compose.yml      # App + FlareSolverr stack
```
