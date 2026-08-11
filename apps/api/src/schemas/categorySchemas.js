import { z } from 'zod';
import { booleanQuery, id } from './commonSchemas.js';

const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const categoryBase = z.object({
  name: z.string().trim().min(1).max(100),
  slug: slug.optional(),
  display_order: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const categoryCreateBody = categoryBase.extend({
  display_order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const categoryUpdateBody = categoryBase.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviarse al menos un campo',
);

export const categoryListQuery = z.object({
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: booleanQuery.optional(),
});
