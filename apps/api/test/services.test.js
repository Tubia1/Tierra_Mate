import test from 'node:test';
import assert from 'node:assert/strict';
import { executeTransaction } from '../src/database/pool.js';
import { createCategoryService } from '../src/services/categoryService.js';
import { createOrderService } from '../src/services/orderService.js';
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

function createOrderRequest(overrides = {}) {
  return {
    customer: {
      name: 'Ana Gomez',
      phone: '1122334455',
      locality: 'Moron',
      address: 'Av. Siempre Viva 123',
    },
    items: [
      {
        variant_id: 10,
        quantity: 2,
        personalizations: [
          { option_id: 100, selected_value: 'iniciales', customer_note: 'AG' },
        ],
      },
    ],
    ...overrides,
  };
}

function createOrderRepository(overrides = {}) {
  const calls = { createdItems: [], createdPersonalizations: [] };
  return {
    calls,
    transaction: async (callback) => callback({}),
    getStoreSettings: async () => ({
      store_name: 'Tierra Mate Shop',
      whatsapp_number: '5491122334455',
      reservation_minutes: 30,
      currency: 'ARS',
    }),
    lockVariants: async () => [{
      variant_id: 10,
      product_id: 1,
      sku: 'MATE-IMP',
      variant_name: 'Imperial',
      price: '1000.00',
      stock_quantity: 5,
      product_name: 'Mate Premium',
    }],
    getReservedQuantities: async () => [],
    getPersonalizationOptions: async () => [{
      id: 100,
      product_id: 1,
      name: 'Grabado',
      input_type: 'select',
      choices: [{ value: 'iniciales', label: 'Iniciales' }],
      extra_price: '150.00',
      required: true,
      allows_note: true,
    }],
    createOrder: async (_client, data) => ({
      id: 77,
      code: 'TMS-000077',
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      customer_locality: data.customer.locality,
      customer_address: data.customer.address,
      customer_notes: data.customer.notes ?? null,
      status: 'reserved',
      subtotal: data.subtotal,
      shipping_cost: null,
      total: data.total,
      reserved_until: '2026-08-12T15:30:00.000Z',
      created_at: '2026-08-12T15:00:00.000Z',
    }),
    createOrderItem: async (_client, orderId, item) => {
      const stored = { id: calls.createdItems.length + 1, order_id: orderId, ...item };
      calls.createdItems.push(stored);
      return stored;
    },
    createOrderItemPersonalization: async (_client, orderItemId, personalization) => {
      const stored = { id: calls.createdPersonalizations.length + 1, order_item_id: orderItemId, ...personalization };
      calls.createdPersonalizations.push(stored);
      return stored;
    },
    ...overrides,
  };
}

test('orderService calcula precios y arma WhatsApp sin confiar en totales del cliente', async () => {
  const service = createOrderService(createOrderRepository());

  const result = await service.create(createOrderRequest({ total: 1 }));

  assert.equal(result.order.status, 'reserved');
  assert.equal(result.order.subtotal, '2300.00');
  assert.equal(result.order.total, '2300.00');
  assert.equal(result.order.items[0].line_total, '2300.00');
  assert.match(result.message, /Pedido TMS-000077/);
  assert.match(result.whatsapp_url, /^https:\/\/wa\.me\/5491122334455\?text=/);
});

test('orderService exige personalizaciones obligatorias', async () => {
  const service = createOrderService(createOrderRepository());

  await assert.rejects(
    service.create(createOrderRequest({ items: [{ variant_id: 10, quantity: 1, personalizations: [] }] })),
    (error) => error.code === 'REQUIRED_PERSONALIZATION_MISSING',
  );
});

test('orderService rechaza stock insuficiente considerando reservas vigentes', async () => {
  const service = createOrderService(createOrderRepository({
    getReservedQuantities: async () => [{ variant_id: 10, reserved_quantity: 4 }],
  }));

  await assert.rejects(
    service.create(createOrderRequest()),
    (error) => error.code === 'INSUFFICIENT_STOCK' && error.details.available === 1,
  );
});

test('orderService rechaza variantes repetidas', async () => {
  const service = createOrderService(createOrderRepository());

  await assert.rejects(
    service.create(createOrderRequest({
      items: [
        { variant_id: 10, quantity: 1, personalizations: [{ option_id: 100, selected_value: 'iniciales' }] },
        { variant_id: 10, quantity: 1, personalizations: [{ option_id: 100, selected_value: 'iniciales' }] },
      ],
    })),
    (error) => error.code === 'DUPLICATE_VARIANT',
  );
});

test('orderService devuelve paginacion y next_cursor del repositorio', async () => {
  const expected = { items: [{ id: 30 }, { id: 29 }], nextCursor: 29 };
  const service = createOrderService({
    list: async (filters) => {
      assert.deepEqual(filters, { limit: 2, cursor: 31 });
      return expected;
    },
  });

  assert.deepEqual(await service.list({ limit: 2, cursor: 31 }), expected);
});

test('orderService devuelve ORDER_NOT_FOUND para un pedido inexistente', async () => {
  const service = createOrderService({ findById: async () => null });
  await assert.rejects(
    service.getById(999),
    (error) => error.statusCode === 404 && error.code === 'ORDER_NOT_FOUND',
  );
});

test('orderService devuelve el detalle con items y personalizaciones', async () => {
  const detail = {
    id: 77,
    code: 'TMS-000077',
    items: [{
      id: 1,
      product_name: 'Mate Premium',
      variant_name: 'Imperial',
      sku: 'MATE-IMP',
      unit_price: '1000.00',
      quantity: 2,
      line_total: '2300.00',
      personalizations: [{ option_name: 'Grabado', extra_price: '150.00' }],
    }],
  };
  const service = createOrderService({ findById: async () => detail });

  const result = await service.getById(77);
  assert.equal(result.items[0].product_name, 'Mate Premium');
  assert.equal(result.items[0].personalizations[0].option_name, 'Grabado');
});

function createOrderTransitionRepository(order, overrides = {}) {
  const calls = {
    cancelled: 0,
    expired: 0,
    stockChanges: 0,
    inventoryMovements: 0,
  };
  let currentOrder = order ? { ...order } : null;
  return {
    calls,
    transaction: async (callback) => callback({}),
    lockOrder: async () => currentOrder,
    cancelOrder: async (_client, _id, reason) => {
      calls.cancelled += 1;
      currentOrder = {
        ...currentOrder,
        status: 'cancelled',
        cancelled_at: '2026-08-14T12:00:00.000Z',
        cancellation_reason: reason,
      };
      return currentOrder;
    },
    markOrderExpired: async () => {
      calls.expired += 1;
      currentOrder = { ...currentOrder, status: 'expired' };
      return currentOrder;
    },
    changeStock: async () => { calls.stockChanges += 1; },
    createInventoryMovement: async () => { calls.inventoryMovements += 1; },
    ...overrides,
  };
}

test('orderService cancela una reserva activa sin tocar inventario', async () => {
  const repository = createOrderTransitionRepository({
    id: 77,
    code: 'TMS-000077',
    status: 'reserved',
    reservation_expired: false,
  });
  const service = createOrderService(repository);

  const result = await service.cancel(77, { reason: 'El cliente cancelo' });

  assert.equal(result.status, 'cancelled');
  assert.equal(result.cancellation_reason, 'El cliente cancelo');
  assert.equal(repository.calls.cancelled, 1);
  assert.equal(repository.calls.stockChanges, 0);
  assert.equal(repository.calls.inventoryMovements, 0);
});

test('orderService hace idempotente una cancelacion repetida', async () => {
  const repository = createOrderTransitionRepository({
    id: 77,
    code: 'TMS-000077',
    status: 'cancelled',
    cancelled_at: '2026-08-14T12:00:00.000Z',
  });
  const result = await createOrderService(repository).cancel(77, { reason: 'otra razon' });

  assert.equal(result.status, 'cancelled');
  assert.equal(repository.calls.cancelled, 0);
});

test('orderService devuelve ORDER_NOT_FOUND al cancelar un pedido inexistente', async () => {
  const repository = createOrderTransitionRepository(null);
  await assert.rejects(
    createOrderService(repository).cancel(999, {}),
    (error) => error.statusCode === 404 && error.code === 'ORDER_NOT_FOUND',
  );
});

for (const status of ['confirmed', 'preparing', 'completed']) {
  test(`orderService no permite cancelar un pedido ${status}`, async () => {
    const repository = createOrderTransitionRepository({ id: 77, status });
    await assert.rejects(
      createOrderService(repository).cancel(77, {}),
      (error) => error.statusCode === 409 && error.code === 'INVALID_ORDER_STATUS',
    );
    assert.equal(repository.calls.cancelled, 0);
  });
}

test('orderService vence y rechaza la cancelacion de una reserva vencida', async () => {
  const repository = createOrderTransitionRepository({
    id: 77,
    code: 'TMS-000077',
    status: 'reserved',
    reservation_expired: true,
  });

  await assert.rejects(
    createOrderService(repository).cancel(77, {}),
    (error) => error.statusCode === 409
      && error.code === 'RESERVATION_EXPIRED'
      && error.details.order.status === 'expired',
  );
  assert.equal(repository.calls.expired, 1);
  assert.equal(repository.calls.cancelled, 0);
});

test('orderService vence solo reservas terminadas y la operacion es idempotente', async () => {
  const storedOrders = [
    { id: '1', code: 'TMS-000001', status: 'reserved', expiredByTime: true },
    { id: '2', code: 'TMS-000002', status: 'reserved', expiredByTime: true },
    { id: '3', code: 'TMS-000003', status: 'reserved', expiredByTime: false },
  ];
  const repository = createOrderTransitionRepository(null, {
    expireReservations: async () => {
      const expired = storedOrders.filter((order) => order.status === 'reserved' && order.expiredByTime);
      for (const order of expired) order.status = 'expired';
      return expired.map(({ id, code }) => ({ id, code }));
    },
  });
  const service = createOrderService(repository);

  assert.deepEqual(await service.expire(), {
    expired_count: 2,
    orders: [{ id: '1', code: 'TMS-000001' }, { id: '2', code: 'TMS-000002' }],
  });
  assert.deepEqual(await service.expire(), { expired_count: 0, orders: [] });
  assert.equal(storedOrders[2].status, 'reserved');
  assert.equal(repository.calls.stockChanges, 0);
  assert.equal(repository.calls.inventoryMovements, 0);
});

test('executeTransaction hace rollback y libera el cliente ante un error', async () => {
  const statements = [];
  let released = false;
  const client = {
    query: async (statement) => { statements.push(statement); },
    release: () => { released = true; },
  };

  await assert.rejects(
    executeTransaction(client, async () => { throw new Error('fallo intermedio'); }),
    /fallo intermedio/,
  );
  assert.deepEqual(statements, ['begin', 'rollback']);
  assert.equal(released, true);
});
