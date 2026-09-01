import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { adminUserCreateBody, adminUserIdParams, adminUserPasswordBody, adminUserStatusBody } from '../schemas/adminUserSchemas.js';
import { adminUserService } from '../services/adminUserService.js';

export const adminUserController = Router();
adminUserController.use(requireAdmin);
adminUserController.get('/', asyncHandler(async (_req, res) => res.json({ data: await adminUserService.list() })));
adminUserController.post('/', validate({ body: adminUserCreateBody }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await adminUserService.create(req.validated.body) });
}));
adminUserController.patch('/:id/status', validate({ params: adminUserIdParams, body: adminUserStatusBody }), asyncHandler(async (req, res) => {
  res.json({ data: await adminUserService.setStatus(req.validated.params.id, req.validated.body.active, req.admin.id) });
}));
adminUserController.patch('/:id/password', validate({ params: adminUserIdParams, body: adminUserPasswordBody }), asyncHandler(async (req, res) => {
  res.json({ data: await adminUserService.resetPassword(req.validated.params.id, req.validated.body.password) });
}));
