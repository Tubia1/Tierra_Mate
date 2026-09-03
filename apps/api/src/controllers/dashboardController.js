import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { dashboardService } from '../services/dashboardService.js';

export const dashboardController = Router();
dashboardController.use(requireAdmin);
dashboardController.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await dashboardService.get() });
}));
