/**
 * Validation Schemas using Zod
 */

const { z } = require('zod');

// Provider parameter validation
const providerSchema = z.string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Provider must be alphanumeric with underscores/hyphens only')
  .transform(val => val.toLowerCase());

// Query parameter validation
const querySchema = z.string()
  .max(200, 'Query too long (max 200 characters)')
  .transform(val => val.trim())
  .refine(val => val.length > 0, 'Query must not be empty');

// Page parameter validation
const pageSchema = z.string()
  .optional()
  .default('1')
  .transform(val => parseInt(val, 10))
  .refine(val => val > 0 && val <= 100, 'Page must be between 1 and 100');

// Suggestion query validation
const suggestionQuerySchema = z.string()
  .min(1)
  .max(100)
  .transform(val => val.trim());

// Combined search params schema
const searchParamsSchema = z.object({
  provider: providerSchema,
  query: querySchema,
  page: pageSchema,
});

// Suggestion params schema
const suggestionParamsSchema = z.object({
  q: suggestionQuerySchema,
});

module.exports = {
  providerSchema,
  querySchema,
  pageSchema,
  suggestionQuerySchema,
  searchParamsSchema,
  suggestionParamsSchema,
};
