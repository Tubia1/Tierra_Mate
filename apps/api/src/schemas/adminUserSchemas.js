import { z } from 'zod';
import { id } from './commonSchemas.js';

export const adminUserIdParams = z.object({ id });
export const adminUserCreateBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
}).strict();
export const adminUserStatusBody = z.object({ active: z.boolean() }).strict();
export const adminUserPasswordBody = z.object({ password: z.string().min(10).max(128) }).strict();
