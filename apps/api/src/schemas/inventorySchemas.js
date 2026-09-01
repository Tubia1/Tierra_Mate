import { z } from 'zod';
import { id } from './commonSchemas.js';

export const INVENTORY_MOVEMENT_TYPES = [
  'initial_stock', 'manual_adjustment', 'confirmed_sale', 'returned_stock',
];

export const inventoryMovementsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: id.optional(),
  movement_type: z.enum(INVENTORY_MOVEMENT_TYPES).optional(),
  product_id: id.optional(),
  variant_id: id.optional(),
  order_id: id.optional(),
  admin_user_id: id.optional(),
}).strict();
