import test from 'node:test';
import assert from 'node:assert/strict';
import { createCategoryService } from '../src/services/categoryService.js';
import { createProductService } from '../src/services/productService.js';

test('categoryService genera el slug automáticamente', async () => {
  let received;
  const service = createCategoryService({
    create: async (data) => { received = data; return data; },
  });
  await service.create({ name: 'Mates Premium', display_order: 1, active: true });
  assert.equal(received.slug, 'mates-premium');
});

test('productService rechaza una categoría inexistente', async () => {
  const service = createProductService({ categoryExists: async () => false });
  await assert.rejects(
    service.create({ category_id: 99, name: 'Mate', featured: false, active: true }),
    (error) => error.code === 'INVALID_CATEGORY',
  );
});

test('productService genera slug y crea el producto', async () => {
  let received;
  const service = createProductService({
    categoryExists: async () => true,
    create: async (data) => { received = data; return data; },
  });
  await service.create({ category_id: 1, name: 'Imperial Negro', featured: false, active: true });
  assert.equal(received.slug, 'imperial-negro');
});

test('productService no permite modificar un producto inexistente', async () => {
  const service = createProductService({ findById: async () => null });
  await assert.rejects(
    service.update(10, { name: 'Otro nombre' }),
    (error) => error.code === 'PRODUCT_NOT_FOUND',
  );
});
