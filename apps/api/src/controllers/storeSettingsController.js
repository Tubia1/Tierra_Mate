import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { storeSettingsUpdateBody } from '../schemas/storeSettingsSchemas.js';
import { storeSettingsService } from '../services/storeSettingsService.js';

export const storeSettingsController = Router();
storeSettingsController.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await storeSettingsService.get() });
}));
storeSettingsController.patch('/', requireAdmin, validate({ body: storeSettingsUpdateBody }), asyncHandler(async (req, res) => {
  res.json({ data: await storeSettingsService.update(req.validated.body) });
}));
