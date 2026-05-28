# Torrent Search API

A secure, self-hosted REST API and web UI for searching torrents across multiple providers simultaneously. Built with Node.js and Express, featuring security hardening, caching, rate limiting, and Cloudflare bypass via FlareSolverr.

[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-required-2496ed?style=flat-square)](docker-compose.yml)
[![Tests](https://img.shields.io/badge/Tests-Jest-green?style=flat-square)](package.json)

> [!IMPORTANT]
> This project requires Docker. FlareSolverr must run alongside the API to bypass Cloudflare protection on most providers.

## Features

- **Secure by default** — Helmet.js security headers, rate limiting, input validation
- **Search 10+ providers** from a single API
- **Combo search** — query all providers in parallel with error resilience
- **In-memory caching** — reduces redundant requests and improves response times
- **Built-in web UI** with search suggestions, sort controls, pagination, and one-click magnet copy
- **Health monitoring** — health check endpoint and provider status tracking
- **Cloudflare bypass** via [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)
- **Dynamic provider loading** — add or remove scrapers by dropping files into `torrent/`
- **Swagger API docs** at `/api-docs`
- **Graceful shutdown** — handles SIGTERM/SIGINT properly

## Providers

| Provider | Keyword | Status |
|---|---|---|
| 1337x | `1337x` | ✅ Working |
| BitSearch | `bitsearch` | ✅ Working |
| GloDLS | `glodls` | ✅ Working |
| LimeTorrents | `limetorrent` | ✅ Working |
| Nyaa.si | `nyaasi` | ✅ Working |
| The Pirate Bay | `piratebay` | ✅ Working |
| TorrentDownloads | `torrentdownloads` | ✅ Working |
| TorrentProject | `torrentproject` | ✅ Working |
| YTS | `yts` | ✅ Working |

> [!NOTE]
> RARBG shut down in May 2023 and has been removed from the provider list.

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com) and [Docker Compose](https://docs.docker.com/compose/)

### Deploy

```bash
git clone https://github.com/NoobLk/Torrent-Search-API.git
cd Torrent-Search-API
docker compose up -d
```

The API and FlareSolverr start together. The API is available at `http://localhost:3001`.

## API Reference

Full API documentation is available at `http://localhost:3001/api-docs`

### Health Check

```
GET /api/health
```

Returns service health, uptime, provider status, and cache statistics.

### List Providers

```
GET /api/torrents
```

Returns an array of available provider keywords.

### Search

```
GET /api/:provider/:query/:page?
```

| Parameter | Description | Validation |
|---|---|---|
| `provider` | Provider keyword or `all` | Alphanumeric, max 50 chars |
| `query` | Search term | Required, 1-200 chars |
| `page` | Page number | Optional, 1-100, default: 1 |

**Examples:**

```bash
# Search single provider
curl "http://localhost:3001/api/1337x/ubuntu/1"

# Combo search (all providers)
curl "http://localhost:3001/api/all/ubuntu/1"
```

### Search Suggestions

```
GET /api/suggest?q=:query
```

Returns up to 8 Google-powered search suggestions as a JSON string array.

### Response Format

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
| `NODE_ENV` | `development` | Environment (development/production) |
| `USE_FLARESOLVERR` | — | Set to `true` to enable FlareSolverr |
| `FLARESOLVERR_URL` | `http://flaresolverr:8191/v1` | FlareSolverr endpoint |
| `LOG_LEVEL` | `info` | Logging level (error/warn/info/debug) |
| `CORS_ORIGIN` | `*` | CORS origin whitelist |

Setting `FLARESOLVERR_URL` implicitly enables FlareSolverr.

## Web UI

Open `http://localhost:3001` for the built-in search interface:

- **Search suggestions** — Google-powered autocomplete
- **All Sites** — search all providers at once
- **Sort controls** — by Seeders, Leechers, Size, or Name
- **Pagination** — browse pages
- **Copy Magnet** — one-click clipboard copy

## Development

### Run Tests

```bash
npm install
npm test
```

### Run Locally (without Docker)

```bash
npm install
npm run start
```

## Adding a Provider

Create a file in `torrent/` that exports an async function:

```js
const request = require('./request');

async function myProvider(query, page = '1') {
    const url = `https://example.com/search?q=${encodeURIComponent(query)}&page=${page}`;
    const html = await request(url);
    // Parse and return array of torrent objects
    return [{ Name: '...', Magnet: '...', ... }];
}

myProvider.customName = 'my-provider'; // Optional
module.exports = myProvider;
```

## Project Structure

```
├── app.js                  # Express server with security middleware
├── config.js               # Centralized configuration
├── lib/
│   ├── cache.js            # In-memory caching
│   ├── logger.js           # Structured logging
│   └── validation.js         # Zod validation schemas
├── public/
│   └── index.html          # Web UI
├── torrent/
│   ├── torrents.js         # Dynamic provider loader
│   ├── COMBO.js            # Parallel search with resilience
│   ├── request.js          # HTTP client with retry logic
│   └── *.js                # Provider scrapers
├── __tests__/              # Jest test suite
├── Dockerfile              # Multi-stage build
└── docker-compose.yml      # Production stack
```

## Security Features

- **Helmet.js** — Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Rate limiting** — 100 requests per 15 minutes per IP
- **Input validation** — Zod schema validation on all inputs
- **CORS protection** — Configurable origin whitelist
- **Non-root container** — Runs as unprivileged user in Docker
- **Body size limits** — Prevents large payload attacks

## License

ISC License — see [LICENSE](LICENSE) for details.
