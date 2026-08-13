import { z } from 'zod';
import { id } from './commonSchemas.js';

const optionalText = (max) => z.string().trim().min(1).max(max).optional();

export const orderCreateBody = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(180),
    phone: z.string().trim().min(1).max(80),
    locality: z.string().trim().min(1).max(180),
    address: z.string().trim().min(1).max(250),
    notes: optionalText(1000),
  }),
  items: z.array(z.object({
    variant_id: id,
    quantity: z.coerce.number().int().min(1).max(100),
    personalizations: z.array(z.object({
      option_id: id,
      selected_value: optionalText(500),
      customer_note: optionalText(500),
    })).default([]),
  })).min(1).max(100),
}).strict();
