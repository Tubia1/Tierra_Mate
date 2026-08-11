import { z } from 'zod';
import { booleanQuery, id } from './commonSchemas.js';

const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const nullableText = z.string().trim().max(5000).nullable();

const productBase = z.object({
  category_id: id,
  name: z.string().trim().min(1).max(180),
  slug,
  description: nullableText,
  materials: z.string().trim().max(500).nullable(),
  featured: z.boolean(),
  active: z.boolean(),
});

export const productCreateBody = productBase.extend({
  slug: slug.optional(),
  description: nullableText.optional(),
  materials: z.string().trim().max(500).nullable().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const productUpdateBody = productBase.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviarse al menos un campo',
);

export const productListQuery = z.object({
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category_id: id.optional(),
  active: booleanQuery.optional(),
  featured: booleanQuery.optional(),
});

const variantBase = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  color: z.string().trim().max(100).nullable(),
  finish: z.string().trim().max(100).nullable(),
  price: z.coerce.number().min(0),
  stock_quantity: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const variantCreateBody = variantBase.extend({
  color: z.string().trim().max(100).nullable().optional(),
  finish: z.string().trim().max(100).nullable().optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(2),
  active: z.boolean().default(true),
});

export const variantUpdateBody = variantBase.omit({ stock_quantity: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviarse al menos un campo',
);

export const stockAdjustmentBody = z.object({
  new_stock: z.coerce.number().int().min(0),
  note: z.string().trim().min(1).max(500).optional(),
});

const imageBase = z.object({
  storage_path: z.string().trim().min(1).max(1000),
  alt_text: z.string().trim().max(300).nullable(),
  is_primary: z.boolean(),
  display_order: z.coerce.number().int().min(0),
});

export const imageCreateBody = imageBase.extend({
  alt_text: z.string().trim().max(300).nullable().optional(),
  is_primary: z.boolean().default(false),
  display_order: z.coerce.number().int().min(0).default(0),
});

export const imageUpdateBody = imageBase.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviarse al menos un campo',
);

const personalizationBase = z.object({
  name: z.string().trim().min(1).max(150),
  input_type: z.enum(['select', 'text', 'boolean']),
  choices: z.array(z.object({
    value: z.string().trim().min(1),
    label: z.string().trim().min(1),
  })).nullable(),
  extra_price: z.coerce.number().min(0),
  required: z.boolean(),
  allows_note: z.boolean(),
  display_order: z.coerce.number().int().min(0),
  active: z.boolean(),
});

function validateSelectChoices(data, context) {
  if (data.input_type === 'select' && (!data.choices || data.choices.length === 0)) {
    context.addIssue({
      code: 'custom',
      path: ['choices'],
      message: 'Las opciones de tipo select necesitan choices',
    });
  }
}

export const personalizationCreateBody = personalizationBase.extend({
  choices: z.array(z.object({
    value: z.string().trim().min(1),
    label: z.string().trim().min(1),
  })).nullable().optional(),
  extra_price: z.coerce.number().min(0).default(0),
  required: z.boolean().default(false),
  allows_note: z.boolean().default(false),
  display_order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
}).superRefine(validateSelectChoices);

export const personalizationUpdateBody = personalizationBase
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Debe enviarse al menos un campo')
  .superRefine(validateSelectChoices);
