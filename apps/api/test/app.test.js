import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import {
  orderCancelBody,
  orderConfirmBody,
  orderCreateBody,
  orderListQuery,
} from '../src/schemas/orderSchemas.js';
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

test('el listado de pedidos requiere autenticacion', async () => {
  const response = await request(app).get('/api/orders').expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('el detalle de pedido requiere autenticacion', async () => {
  const response = await request(app).get('/api/orders/1').expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('el detalle de pedido valida identificadores invalidos', async () => {
  const token = jwt.sign(
    { sub: '1', email: 'admin@example.com' },
    process.env.JWT_SECRET,
    { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' },
  );
  const response = await request(app)
    .get('/api/orders/no-es-un-id')
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('el listado rechaza filtros de estado invalidos', async () => {
  const token = jwt.sign(
    { sub: '1', email: 'admin@example.com' },
    process.env.JWT_SECRET,
    { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' },
  );
  const response = await request(app)
    .get('/api/orders?status=pending')
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('los endpoints de cancelacion y vencimiento requieren autenticacion', async () => {
  const cancelResponse = await request(app).patch('/api/orders/1/cancel').send({}).expect(401);
  assert.equal(cancelResponse.body.error.code, 'AUTH_REQUIRED');

  const expireResponse = await request(app).post('/api/orders/expire').expect(401);
  assert.equal(expireResponse.body.error.code, 'AUTH_REQUIRED');
});

test('la cancelacion valida identificadores invalidos', async () => {
  const token = jwt.sign(
    { sub: '1', email: 'admin@example.com' },
    process.env.JWT_SECRET,
    { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' },
  );
  const response = await request(app)
    .patch('/api/orders/no-es-un-id/cancel')
    .set('Authorization', `Bearer ${token}`)
    .send({})
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('la cancelacion valida la longitud de la razon', async () => {
  const token = jwt.sign(
    { sub: '1', email: 'admin@example.com' },
    process.env.JWT_SECRET,
    { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' },
  );
  const response = await request(app)
    .patch('/api/orders/1/cancel')
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'x'.repeat(501) })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('el body de cancelacion puede omitirse', () => {
  assert.deepEqual(orderCancelBody.parse(undefined), {});
});

test('la confirmacion requiere autenticacion', async () => {
  const response = await request(app).patch('/api/orders/1/confirm').expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('la confirmacion valida identificadores invalidos', async () => {
  const token = jwt.sign(
    { sub: '1', email: 'admin@example.com' },
    process.env.JWT_SECRET,
    { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' },
  );
  const response = await request(app)
    .patch('/api/orders/no-es-un-id/confirm')
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('la confirmacion no acepta cantidades ni variantes en el body', async () => {
  const token = jwt.sign(
    { sub: '1', email: 'admin@example.com' },
    process.env.JWT_SECRET,
    { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' },
  );
  const response = await request(app)
    .patch('/api/orders/1/confirm')
    .set('Authorization', `Bearer ${token}`)
    .send({ variant_id: 10, quantity: 999 })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('el body de confirmacion puede omitirse', () => {
  assert.deepEqual(orderConfirmBody.parse(undefined), {});
});

test('orderListQuery aplica el limite predeterminado y sus limites', () => {
  assert.deepEqual(orderListQuery.parse({}), { limit: 20 });
  assert.throws(() => orderListQuery.parse({ limit: 0 }));
  assert.throws(() => orderListQuery.parse({ limit: 101 }));
});
