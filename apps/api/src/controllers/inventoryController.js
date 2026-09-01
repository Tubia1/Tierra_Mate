import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { inventoryMovementsQuery } from '../schemas/inventorySchemas.js';
import { inventoryService } from '../services/inventoryService.js';

export const inventoryController = Router();
inventoryController.use(requireAdmin);
inventoryController.get('/movements', validate({ query: inventoryMovementsQuery }), asyncHandler(async (req, res) => {
  const result = await inventoryService.listMovements(req.validated.query);
  res.json({ data: result.items, pagination: { next_cursor: result.nextCursor } });
}));
inventoryController.get('/low-stock', asyncHandler(async (_req, res) => {
  res.json({ data: await inventoryService.listLowStock() });
}));
