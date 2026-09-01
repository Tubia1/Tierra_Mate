import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { createRequireAdmin } from '../src/middlewares/authMiddleware.js';
import { adminUserCreateBody, adminUserIdParams } from '../src/schemas/adminUserSchemas.js';
import { storeSettingsUpdateBody } from '../src/schemas/storeSettingsSchemas.js';
import { createAdminUserService } from '../src/services/adminUserService.js';
import { createStoreSettingsService } from '../src/services/storeSettingsService.js';

test('los endpoints de usuarios y el PATCH de configuracion requieren autenticacion', async () => {
  for (const [method, path] of [['get', '/api/admin-users'], ['post', '/api/admin-users'], ['patch', '/api/store-settings']]) {
    const response = await request(app)[method](path).send({}).expect(401);
    assert.equal(response.body.error.code, 'AUTH_REQUIRED');
  }
});

test('la configuracion valida body no vacio, moneda, minutos y normaliza telefono', () => {
  assert.throws(() => storeSettingsUpdateBody.parse({}));
  assert.throws(() => storeSettingsUpdateBody.parse({ reservation_minutes: 0 }));
  assert.throws(() => storeSettingsUpdateBody.parse({ currency: 'ars' }));
  assert.equal(storeSettingsUpdateBody.parse({ whatsapp_number: '+54 9 11 5555-1234' }).whatsapp_number, '5491155551234');
});

test('storeSettingsService devuelve URL y actualiza solo los valores recibidos', async () => {
  let stored = { store_name: 'Tierra Mate Shop', whatsapp_number: '5491100000000', reservation_minutes: 30, currency: 'ARS', updated_at: 'antes' };
  const service = createStoreSettingsService({ get: async () => stored, update: async (values) => (stored = { ...stored, ...values, updated_at: 'despues' }) });
  const result = await service.update({ store_name: 'Mate Lujan', whatsapp_number: '5491122222222', reservation_minutes: 45, currency: 'USD' });
  assert.equal(result.whatsapp_url, 'https://wa.me/5491122222222');
  assert.equal(result.reservation_minutes, 45);
  assert.equal(result.currency, 'USD');
});

test('adminUserService crea cuentas con email normalizado y hash, sin devolver hash', async () => {
  let saved;
  const service = createAdminUserService({ create: async (value) => { saved = value; return { id: 2, name: value.name, email: value.email, active: true }; } });
  const input = adminUserCreateBody.parse({ name: 'Empleado', email: 'EMPLEADO@Ejemplo.com', password: 'segura-12345' });
  const result = await service.create(input);
  assert.equal(saved.email, 'empleado@ejemplo.com');
  assert.equal(await bcrypt.compare(input.password, saved.passwordHash), true);
  assert.equal(result.password_hash, undefined);
});

test('adminUserService traduce duplicados y aplica reglas de desactivacion', async () => {
  const duplicate = createAdminUserService({ create: async () => { const error = new Error(); error.code = '23505'; throw error; } }, async () => 'hash');
  await assert.rejects(duplicate.create({ name: 'A', email: 'a@a.com', password: '1234567890' }), (error) => error.code === 'ADMIN_EMAIL_ALREADY_EXISTS');
  const service = createAdminUserService({ setStatusSafely: async () => 'last_active' });
  await assert.rejects(service.setStatus(1, false, 1), (error) => error.code === 'CANNOT_DEACTIVATE_SELF');
  await assert.rejects(service.setStatus(2, false, 1), (error) => error.code === 'LAST_ACTIVE_ADMIN');
});

test('reset de password genera hash nuevo y conserva el estado devuelto', async () => {
  let hash;
  const service = createAdminUserService({ updatePasswordById: async (_id, value) => { hash = value; return { id: 2, active: false }; } });
  const result = await service.resetPassword(2, 'nueva-segura-123');
  assert.equal(result.active, false);
  assert.equal(await bcrypt.compare('nueva-segura-123', hash), true);
});

test('IDs invalidos fallan validacion y usuarios inexistentes usan codigo estable', async () => {
  assert.throws(() => adminUserIdParams.parse({ id: 'no-id' }));
  const service = createAdminUserService({ updatePasswordById: async () => null }, async () => 'hash');
  await assert.rejects(service.resetPassword(99, '1234567890'), (error) => error.code === 'ADMIN_USER_NOT_FOUND');
});

test('un JWT valido deja de autorizar cuando la cuenta esta inactiva', async () => {
  const middleware = createRequireAdmin(async () => ({ id: 1, email: 'admin@example.com', active: false }));
  const token = jwt.sign({ email: 'admin@example.com' }, process.env.JWT_SECRET, { subject: '1', issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' });
  const error = await new Promise((resolve) => middleware({ headers: { authorization: `Bearer ${token}` } }, {}, resolve));
  assert.equal(error.statusCode, 401); assert.equal(error.code, 'ADMIN_INACTIVE');
});
