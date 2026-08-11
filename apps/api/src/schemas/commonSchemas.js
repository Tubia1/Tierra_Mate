import { z } from 'zod';

export const id = z.coerce.number().int().positive();
export const idParams = z.object({ id });
export const productIdParams = z.object({ productId: id });
export const nestedIdParams = z.object({ productId: id, id });

export const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');
