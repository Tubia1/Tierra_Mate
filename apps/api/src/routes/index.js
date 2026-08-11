import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { categoryController } from '../controllers/categoryController.js';
import { productController } from '../controllers/productController.js';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { query } from '../database/pool.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', service: 'tierra-mate-api' } });
});

apiRouter.get('/health/database', asyncHandler(async (_req, res) => {
  await query('select 1');
  res.json({ data: { status: 'ok', database: 'connected' } });
}));

apiRouter.use('/auth', authController);
apiRouter.use('/categories', categoryController);
apiRouter.use('/products', productController);
