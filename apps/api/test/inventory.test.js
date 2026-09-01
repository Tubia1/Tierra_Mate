import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { inventoryMovementsQuery } from '../src/schemas/inventorySchemas.js';
import { createInventoryService } from '../src/services/inventoryService.js';
import { listLowStock, listMovements } from '../src/repositories/inventoryRepository.js';

function token() {
  return jwt.sign({ email: 'admin@example.com' }, process.env.JWT_SECRET, {
    subject: '1', issuer: 'tierra-mate-api', audience: 'tierra-mate-admin',
  });
}

test('ambos endpoints de inventario requieren autenticacion', async () => {
  for (const path of ['/api/inventory/movements', '/api/inventory/low-stock']) {
    const response = await request(app).get(path).expect(401);
    assert.equal(response.body.error.code, 'AUTH_REQUIRED');
  }
});

for (const query of [
  '?limit=0', '?limit=101', '?cursor=no-id', '?movement_type=reservation',
  '?product_id=x', '?variant_id=x', '?order_id=x', '?admin_user_id=x',
]) {
  test(`movimientos rechaza query invalida ${query}`, async () => {
    const response = await request(app).get(`/api/inventory/movements${query}`)
      .set('Authorization', `Bearer ${token()}`).expect(400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });
}

test('schema acepta filtros y aplica limit predeterminado', () => {
  assert.deepEqual(inventoryMovementsQuery.parse({}), { limit: 20 });
  assert.deepEqual(inventoryMovementsQuery.parse({
    limit: '50', cursor: '100', movement_type: 'confirmed_sale', product_id: '2',
    variant_id: '4', order_id: '15', admin_user_id: '1',
  }), { limit: 50, cursor: 100, movement_type: 'confirmed_sale', product_id: 2, variant_id: 4, order_id: 15, admin_user_id: 1 });
});

function row(id, overrides = {}) {
  return {
    id: String(id), movement_type: 'manual_adjustment', quantity_change: 2,
    previous_stock: 3, new_stock: 5, note: 'Ajuste', created_at: '2026-09-01T12:00:00Z',
    product_id: '2', product_name: 'Mate Imperial', product_active: false,
    variant_id: '4', sku: 'IMP-NEGRO', variant_name: 'Negro', color: 'Negro', finish: 'Mate', variant_active: false,
    order_id: null, order_code: null, order_status: null,
    admin_id: null, admin_name: null, admin_email: null, ...overrides,
  };
}

test('servicio pagina por cursor, conserva orden y mapea joins sin hashes', async () => {
  const received = [];
  const repository = { listMovements: async (filters) => { received.push(filters); return [
    row(15, { movement_type: 'confirmed_sale', order_id: '15', order_code: 'TMS-000015', order_status: 'confirmed', admin_id: '1', admin_name: 'Tobias', admin_email: 'admin@ejemplo.com' }),
    row(14), row(13),
  ]; } };
  const result = await createInventoryService(repository).listMovements({ limit: 2, movement_type: 'confirmed_sale', product_id: '2' });
  assert.deepEqual(result.items.map((item) => item.id), ['15', '14']);
  assert.equal(result.nextCursor, '14');
  assert.equal(result.items[0].product.name, 'Mate Imperial');
  assert.equal(result.items[0].variant.sku, 'IMP-NEGRO');
  assert.equal(result.items[0].order.code, 'TMS-000015');
  assert.equal(result.items[0].admin.email, 'admin@ejemplo.com');
  assert.equal(result.items[0].admin.password_hash, undefined);
  assert.equal(result.items[1].order, null); assert.equal(result.items[1].admin, null);
  assert.equal(received[0].movement_type, 'confirmed_sale'); assert.equal(received[0].product_id, '2');
});

test('paginas consecutivas no duplican movimientos cuando el repositorio respeta cursor', async () => {
  const rows = [row(5), row(4), row(3), row(2), row(1)];
  const repository = { listMovements: async ({ cursor, limit }) => rows.filter((item) => !cursor || Number(item.id) < Number(cursor)).slice(0, limit + 1) };
  const service = createInventoryService(repository);
  const first = await service.listMovements({ limit: 2 });
  const second = await service.listMovements({ limit: 2, cursor: first.nextCursor });
  assert.deepEqual(first.items.map((item) => item.id), ['5', '4']);
  assert.deepEqual(second.items.map((item) => item.id), ['3', '2']);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 4);
});

test('alertas se devuelven sin mutar el resultado ni ejecutar escrituras', async () => {
  const alerts = [{ product_id: '2', variant_id: '4', stock_quantity: 3, reserved_units: 2, available_stock: 1, low_stock_threshold: 3 }];
  let calls = 0;
  const result = await createInventoryService({ listLowStock: async () => { calls += 1; return alerts; } }).listLowStock();
  assert.equal(calls, 1); assert.deepEqual(result, alerts);
});

test('repositorio parametriza filtros, pagina y ordena movimientos por ID descendente', async () => {
  let statement; let parameters;
  await listMovements({ limit: 20, cursor: 50, movement_type: 'confirmed_sale', product_id: 2, variant_id: 4, order_id: 15, admin_user_id: 1 }, async (sql, params) => { statement = sql; parameters = params; return { rows: [] }; });
  assert.match(statement, /im\.id < \$1/); assert.match(statement, /im\.movement_type = \$2/);
  assert.match(statement, /p\.id = \$3/); assert.match(statement, /order by im\.id desc/);
  assert.match(statement, /left join public\.orders/); assert.match(statement, /left join public\.admin_users/);
  assert.deepEqual(parameters, [50, 'confirmed_sale', 2, 4, 15, 1, 21]);
  assert.doesNotMatch(statement, /password_hash/i);
});

test('SQL de alertas incluye limite exacto, activos y solo reservas vigentes agrupadas', async () => {
  let statement;
  await listLowStock(async (sql) => { statement = sql; return { rows: [] }; });
  assert.match(statement, /v\.stock_quantity <= v\.low_stock_threshold/);
  assert.match(statement, /v\.active = true/); assert.match(statement, /p\.active = true/);
  assert.match(statement, /p\.deleted_at is null/); assert.match(statement, /o\.status = 'reserved'/);
  assert.match(statement, /o\.reserved_until > now\(\)/); assert.match(statement, /group by oi\.variant_id/);
  assert.match(statement, /greatest\(v\.stock_quantity - coalesce\(r\.reserved_units, 0\), 0\)/);
  assert.match(statement, /order by v\.stock_quantity asc, p\.name asc, v\.name asc/);
  assert.doesNotMatch(statement, /\b(update|insert|delete)\b/i);
});
