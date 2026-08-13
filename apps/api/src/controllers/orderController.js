import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { orderCreateBody } from '../schemas/orderSchemas.js';
import { orderService } from '../services/orderService.js';

export const orderController = Router();

orderController.post('/', validate({ body: orderCreateBody }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await orderService.create(req.validated.body) });
}));
