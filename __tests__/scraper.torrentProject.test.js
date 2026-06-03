/**
 * Scraper parsing test (offline, fixture-driven).
 *
 * Mocks axios so we exercise the Cheerio parsing logic against a saved HTML
 * snapshot — this is how we detect when a provider's markup changes without
 * hitting the live site. Add a sibling fixture + test per provider over time.
 */

const fs = require('fs');
const path = require('path');

jest.mock('axios');
const axios = require('axios');
const torrentProject = require('../torrent/torrentProject');

const searchHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'torrentProject.search.html'),
  'utf8'
);
const detailHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'torrentProject.detail.html'),
  'utf8'
);

describe('torrentProject scraper (fixture)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.includes('/torrent/')) {
        return Promise.resolve({ data: detailHtml });
      }
      return Promise.resolve({ data: searchHtml });
    });
  });

  it('parses torrents from the search page', async () => {
    const results = await torrentProject('ubuntu', '0');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);

    const first = results[0];
    expect(first.Name).toBe('Ubuntu 20.04 Desktop');
    expect(first.Seeders).toBe('1200');
    expect(first.Leechers).toBe('34');
    expect(first.Size).toBe('2.6 GB');
    expect(first.Url).toContain('/torrent/aaa/ubuntu-20-04.html');
  });

  it('resolves magnet links from detail pages', async () => {
    const results = await torrentProject('ubuntu', '0');
    expect(results[0].Magnet).toMatch(/^magnet:\?xt=urn:btih:DEADBEEF/);
  });

  it('returns null when the search request fails', async () => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('network down'));
    const results = await torrentProject('ubuntu', '0');
    expect(results).toBeNull();
  });
});
