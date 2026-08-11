import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { idParams, nestedIdParams, productIdParams } from '../schemas/commonSchemas.js';
import {
  imageCreateBody, imageUpdateBody, personalizationCreateBody, personalizationUpdateBody,
  productCreateBody, productListQuery, productUpdateBody, stockAdjustmentBody,
  variantCreateBody, variantUpdateBody,
} from '../schemas/productSchemas.js';
import { productService } from '../services/productService.js';

export const productController = Router();

productController.get('/', validate({ query: productListQuery }), asyncHandler(async (req, res) => {
  const result = await productService.list(req.validated.query);
  res.json({ data: result.items, pagination: { next_cursor: result.nextCursor } });
}));

productController.get('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  res.json({ data: await productService.getById(req.validated.params.id) });
}));

productController.post('/', requireAdmin, validate({ body: productCreateBody }), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await productService.create(req.validated.body) });
}));

productController.patch('/:id', requireAdmin, validate({ params: idParams, body: productUpdateBody }), asyncHandler(async (req, res) => {
  res.json({ data: await productService.update(req.validated.params.id, req.validated.body) });
}));

productController.delete('/:id', requireAdmin, validate({ params: idParams }), asyncHandler(async (req, res) => {
  res.json({ data: await productService.remove(req.validated.params.id) });
}));

productController.patch('/:productId/variants/:id/stock', requireAdmin,
  validate({ params: nestedIdParams, body: stockAdjustmentBody }),
  asyncHandler(async (req, res) => {
    const { productId, id } = req.validated.params;
    res.json({
      data: await productService.adjustStock(
        productId,
        id,
        req.validated.body,
        req.admin.id,
      ),
    });
  }));

const nestedRoutes = [
  ['variants', variantCreateBody, variantUpdateBody, 'createVariant', 'updateVariant', 'removeVariant'],
  ['images', imageCreateBody, imageUpdateBody, 'createImage', 'updateImage', 'removeImage'],
  ['personalizations', personalizationCreateBody, personalizationUpdateBody,
    'createPersonalization', 'updatePersonalization', 'removePersonalization'],
];

for (const [path, createSchema, updateSchema, createMethod, updateMethod, removeMethod] of nestedRoutes) {
  productController.post(`/:productId/${path}`, requireAdmin,
    validate({ params: productIdParams, body: createSchema }),
    asyncHandler(async (req, res) => {
      res.status(201).json({
        data: await productService[createMethod](
          req.validated.params.productId,
          req.validated.body,
          req.admin.id,
        ),
      });
    }));

  productController.patch(`/:productId/${path}/:id`, requireAdmin,
    validate({ params: nestedIdParams, body: updateSchema }),
    asyncHandler(async (req, res) => {
      const { productId, id } = req.validated.params;
      res.json({ data: await productService[updateMethod](productId, id, req.validated.body) });
    }));

  productController.delete(`/:productId/${path}/:id`, requireAdmin,
    validate({ params: nestedIdParams }),
    asyncHandler(async (req, res) => {
      const { productId, id } = req.validated.params;
      res.json({ data: await productService[removeMethod](productId, id) });
    }));
}
