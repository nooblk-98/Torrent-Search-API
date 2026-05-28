/**
 * Validation Tests
 */

const {
  providerSchema,
  querySchema,
  pageSchema,
  searchParamsSchema,
} = require('../lib/validation');

describe('Validation Schemas', () => {
  describe('providerSchema', () => {
    it('should validate valid provider names', () => {
      expect(providerSchema.safeParse('1337x').success).toBe(true);
      expect(providerSchema.safeParse('piratebay').success).toBe(true);
      expect(providerSchema.safeParse('yts_mx').success).toBe(true);
    });

    it('should reject invalid provider names', () => {
      expect(providerSchema.safeParse('').success).toBe(false);
      expect(providerSchema.safeParse('a'.repeat(51)).success).toBe(false);
      expect(providerSchema.safeParse('provider<name>').success).toBe(false);
    });

    it('should lowercase provider names', () => {
      const result = providerSchema.safeParse('YTS');
      expect(result.success).toBe(true);
      expect(result.data).toBe('yts');
    });
  });

  describe('querySchema', () => {
    it('should validate valid queries', () => {
      expect(querySchema.safeParse('ubuntu').success).toBe(true);
      expect(querySchema.safeParse('The Matrix').success).toBe(true);
    });

    it('should reject empty queries', () => {
      expect(querySchema.safeParse('').success).toBe(false);
      expect(querySchema.safeParse('   ').success).toBe(false);
    });

    it('should reject queries over 200 chars', () => {
      expect(querySchema.safeParse('a'.repeat(201)).success).toBe(false);
    });

    it('should trim queries', () => {
      const result = querySchema.safeParse('  ubuntu  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('ubuntu');
    });
  });

  describe('pageSchema', () => {
    it('should default to 1', () => {
      const result = pageSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
    });

    it('should parse string page numbers', () => {
      const result = pageSchema.safeParse('5');
      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should reject pages over 100', () => {
      expect(pageSchema.safeParse('101').success).toBe(false);
    });

    it('should reject zero and negative pages', () => {
      expect(pageSchema.safeParse('0').success).toBe(false);
      expect(pageSchema.safeParse('-1').success).toBe(false);
    });
  });

  describe('searchParamsSchema', () => {
    it('should validate complete params', () => {
      const result = searchParamsSchema.safeParse({
        provider: '1337x',
        query: 'ubuntu',
        page: '1',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        provider: '1337x',
        query: 'ubuntu',
        page: 1,
      });
    });

    it('should reject invalid params', () => {
      expect(searchParamsSchema.safeParse({
        provider: '',
        query: '',
        page: 'invalid',
      }).success).toBe(false);
    });
  });
});
