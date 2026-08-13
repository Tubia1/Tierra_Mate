import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { orderCreateBody } from '../src/schemas/orderSchemas.js';
import { productUpdateBody, variantUpdateBody } from '../src/schemas/productSchemas.js';

test('GET / responde con informacion de la API', async () => {
  const response = await request(app).get('/').expect(200);
  assert.equal(response.body.data.status, 'ok');
  assert.equal(response.body.data.service, 'tierra-mate-api');
  assert.equal(response.body.data.apiBasePath, '/api');
});

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

test('orderCreateBody valida los datos obligatorios del pedido', () => {
  assert.throws(() => orderCreateBody.parse({
    customer: { name: 'Ana', phone: '1122334455', locality: 'Moron' },
    items: [{ variant_id: 1, quantity: 1 }],
  }));
});
