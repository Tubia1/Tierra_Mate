import test from 'node:test';
import assert from 'node:assert/strict';
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
