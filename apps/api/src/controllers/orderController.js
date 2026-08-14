import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { orderCreateBody, orderIdParams, orderListQuery } from '../schemas/orderSchemas.js';
import { orderService } from '../services/orderService.js';

export const orderController = Router();

orderController.get('/', requireAdmin, validate({ query: orderListQuery }), asyncHandler(async (req, res) => {
  const result = await orderService.list(req.validated.query);
  res.json({ data: result.items, pagination: { next_cursor: result.nextCursor } });
}));

orderController.get('/:id', requireAdmin, validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
  res.json({ data: await orderService.getById(req.validated.params.id) });
}));

orderController.post('/', validate({ body: orderCreateBody }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await orderService.create(req.validated.body) });
}));
