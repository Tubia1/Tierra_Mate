import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { productUpdateBody, variantUpdateBody } from '../src/schemas/productSchemas.js';

test('GET /api/health responde correctamente', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.data.status, 'ok');
  assert.equal(response.body.data.service, 'tierra-mate-api');
});

test('una ruta inexistente responde 404', async () => {
  const response = await request(app).get('/api/no-existe').expect(404);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
});

test('las escrituras requieren autenticación', async () => {
  const response = await request(app)
    .post('/api/products')
    .send({ category_id: 1, name: 'Mate Imperial' })
    .expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('se validan los identificadores', async () => {
  const response = await request(app).get('/api/products/no-es-un-id').expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('PATCH no agrega valores predeterminados a campos ausentes', () => {
  assert.deepEqual(productUpdateBody.parse({ name: 'Nombre nuevo' }), { name: 'Nombre nuevo' });
  assert.deepEqual(variantUpdateBody.parse({ price: 1500 }), { price: 1500 });
});

test('el stock no puede cambiarse desde el PATCH común de variante', () => {
  assert.throws(() => variantUpdateBody.parse({ stock_quantity: 20 }));
});
