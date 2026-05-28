/**
 * API Tests
 */

const request = require('supertest');
const { app } = require('../app');

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('providers');
      expect(res.body).toHaveProperty('cache');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/torrents', () => {
    it('should return array of providers', async () => {
      const res = await request(app)
        .get('/api/torrents')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/suggest', () => {
    it('should return empty array for empty query', async () => {
      const res = await request(app)
        .get('/api/suggest?q=')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return suggestions for valid query', async () => {
      const res = await request(app)
        .get('/api/suggest?q=ubuntu')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    }, 10000);

    it('should validate query length', async () => {
      const res = await request(app)
        .get('/api/suggest?q=a'.repeat(101))
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/:provider/:query/:page?', () => {
    it('should return 400 for invalid provider name', async () => {
      const res = await request(app)
        .get('/api/invalid<name>/test/1')
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('details');
    });

    it('should return 400 for empty query', async () => {
      const res = await request(app)
        .get('/api/1337x/%20/1')  // URL-encoded space becomes empty after trim
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for query too long', async () => {
      const res = await request(app)
        .get('/api/1337x/' + 'a'.repeat(201) + '/1')
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent provider', async () => {
      const res = await request(app)
        .get('/api/nonexistent/query/1')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('availableProviders');
    });

    it('should handle combo search', async () => {
      const res = await request(app)
        .get('/api/all/ubuntu/1')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    }, 30000);
  });

  describe('Rate limiting', () => {
    it('should include rate limit headers', async () => {
      const res = await request(app)
        .get('/api/torrents')
        .expect(200);

      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('Security headers', () => {
    it('should include security headers', async () => {
      const res = await request(app)
        .get('/api/torrents')
        .expect(200);

      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-frame-options');
    });
  });
});
