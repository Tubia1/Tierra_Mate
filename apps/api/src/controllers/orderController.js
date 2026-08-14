import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import {
  orderCancelBody,
  orderConfirmBody,
  orderCreateBody,
  orderIdParams,
  orderListQuery,
} from '../schemas/orderSchemas.js';
import { orderService } from '../services/orderService.js';

export const orderController = Router();

orderController.get('/', requireAdmin, validate({ query: orderListQuery }), asyncHandler(async (req, res) => {
  const result = await orderService.list(req.validated.query);
  res.json({ data: result.items, pagination: { next_cursor: result.nextCursor } });
}));

orderController.post('/expire', requireAdmin, asyncHandler(async (_req, res) => {
  res.json({ data: await orderService.expire() });
}));

orderController.patch(
  '/:id/cancel',
  requireAdmin,
  validate({ params: orderIdParams, body: orderCancelBody }),
  asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json({ data: await orderService.cancel(id, req.validated.body) });
  }),
);

orderController.patch(
  '/:id/confirm',
  requireAdmin,
  validate({ params: orderIdParams, body: orderConfirmBody }),
  asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json({ data: await orderService.confirm(id, req.admin.id) });
  }),
);

orderController.get('/:id', requireAdmin, validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
  res.json({ data: await orderService.getById(req.validated.params.id) });
}));

orderController.post('/', validate({ body: orderCreateBody }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await orderService.create(req.validated.body) });
}));
