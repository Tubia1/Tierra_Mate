import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { categoryCreateBody, categoryListQuery, categoryUpdateBody } from '../schemas/categorySchemas.js';
import { idParams } from '../schemas/commonSchemas.js';
import { categoryService } from '../services/categoryService.js';

export const categoryController = Router();

categoryController.get('/', validate({ query: categoryListQuery }), asyncHandler(async (req, res) => {
  const result = await categoryService.list(req.validated.query);
  res.json({ data: result.items, pagination: { next_cursor: result.nextCursor } });
}));

categoryController.get('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  res.json({ data: await categoryService.getById(req.validated.params.id) });
}));

categoryController.post('/', requireAdmin, validate({ body: categoryCreateBody }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await categoryService.create(req.validated.body) });
}));

categoryController.patch('/:id', requireAdmin, validate({ params: idParams, body: categoryUpdateBody }), asyncHandler(async (req, res) => {
  res.json({ data: await categoryService.update(req.validated.params.id, req.validated.body) });
}));

categoryController.delete('/:id', requireAdmin, validate({ params: idParams }), asyncHandler(async (req, res) => {
  res.json({ data: await categoryService.deactivate(req.validated.params.id) });
}));
