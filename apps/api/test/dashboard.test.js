import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { STORE_TIMEZONE } from '../src/config/timezone.js';
import { getDashboard } from '../src/repositories/dashboardRepository.js';
import { createDashboardService } from '../src/services/dashboardService.js';

test('GET /api/dashboard requiere autenticacion administrativa', async () => {
  const response = await request(app).get('/api/dashboard').expect(401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('el servicio estructura métricas, conserva históricos y convierte nulos en ceros', async () => {
  let timezone;
  const service = createDashboardService({ getDashboard: async (value) => {
    timezone = value;
    return { generated_at: '2026-09-02T12:00:00.000Z', active_reservations: '3', confirmed: '2', preparing: '1', completed_today: '4', today_count: '2', today_total: '70000', month_count: '0', month_total: null, low_stock_variants: '4', out_of_stock_variants: '1', recent_orders: [{ id: '15' }], top_products_month: null };
  } });
  const result = await service.get();
  assert.equal(timezone, STORE_TIMEZONE);
  assert.deepEqual(result.orders, { active_reservations: 3, confirmed: 2, preparing: 1, completed_today: 4 });
  assert.deepEqual(result.sales, { today_count: 2, today_total: '70000.00', month_count: 0, month_total: '0.00' });
  assert.deepEqual(result.inventory, { low_stock_variants: 4, out_of_stock_variants: 1 });
  assert.deepEqual(result.top_products_month, []);
});

test('la consulta aplica todas las reglas sin escrituras ni duplicación por personalizaciones', async () => {
  let sql; let params; let calls = 0;
  await getDashboard(STORE_TIMEZONE, async (statement, values) => { calls += 1; sql = statement; params = values; return { rows: [{}] }; });
  assert.equal(calls, 1); assert.deepEqual(params, [STORE_TIMEZONE]);
  assert.match(sql, /status = 'reserved' and o\.reserved_until > now\(\)/);
  assert.match(sql, /status = 'completed' and o\.completed_at >= b\.day_start/);
  assert.match(sql, /status in \('confirmed', 'preparing', 'completed'\)/);
  assert.match(sql, /o\.confirmed_at >= b\.day_start/); assert.match(sql, /o\.confirmed_at >= b\.month_start/);
  assert.match(sql, /now\(\) at time zone \$1/); assert.match(sql, /interval '1 day'/); assert.match(sql, /interval '1 month'/);
  assert.match(sql, /sum\(o\.total\) filter/); assert.match(sql, /from public\.orders o cross join boundaries/);
  assert.match(sql, /v\.stock_quantity <= v\.low_stock_threshold/); assert.match(sql, /v\.stock_quantity = 0/);
  assert.match(sql, /v\.active = true and p\.active = true and p\.deleted_at is null/);
  assert.match(sql, /coalesce\(sum\(oi\.quantity\), 0\)/); assert.match(sql, /order by o\.id desc\s+limit 8/);
  assert.match(sql, /sum\(oi\.quantity\)/); assert.match(sql, /count\(distinct oi\.order_id\)/); assert.match(sql, /sum\(oi\.line_total\)/);
  assert.match(sql, /array_agg\(oi\.product_name order by oi\.id desc\)/); assert.match(sql, /limit 5/);
  assert.doesNotMatch(sql, /order_item_personalizations/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate)\b/i);
});
