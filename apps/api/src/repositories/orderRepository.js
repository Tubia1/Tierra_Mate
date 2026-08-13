import { withTransaction } from '../database/pool.js';

export function transaction(callback) {
  return withTransaction(callback);
}

export async function getStoreSettings(client) {
  const result = await client.query(
    `select store_name, whatsapp_number, reservation_minutes, currency
     from public.store_settings
     where id = 1`,
  );
  return result.rows[0] ?? {
    store_name: 'Tierra Mate Shop',
    whatsapp_number: null,
    reservation_minutes: 30,
    currency: 'ARS',
  };
}

export async function lockVariants(client, variantIds) {
  const result = await client.query(
    `select
       v.id as variant_id,
       v.product_id,
       v.sku,
       v.name as variant_name,
       v.price,
       v.stock_quantity,
       p.name as product_name
     from public.product_variants v
     join public.products p on p.id = v.product_id
     where v.id = any($1::bigint[])
       and v.active = true
       and p.active = true
       and p.deleted_at is null
     order by v.id asc
     for update of v`,
    [variantIds],
  );
  return result.rows;
}

export async function getReservedQuantities(client, variantIds) {
  const result = await client.query(
    `select oi.variant_id, coalesce(sum(oi.quantity), 0)::integer as reserved_quantity
     from public.order_items oi
     join public.orders o on o.id = oi.order_id
     where oi.variant_id = any($1::bigint[])
       and o.status = 'reserved'
       and o.reserved_until > now()
     group by oi.variant_id`,
    [variantIds],
  );
  return result.rows;
}

export async function getPersonalizationOptions(client, productIds) {
  const result = await client.query(
    `select id, product_id, name, input_type, choices, extra_price, required, allows_note
     from public.personalization_options
     where product_id = any($1::bigint[])
       and active = true
     order by product_id asc, display_order asc, id asc`,
    [productIds],
  );
  return result.rows;
}

export async function createOrder(client, { customer, subtotal, total, reservationMinutes }) {
  const result = await client.query(
    `insert into public.orders
       (customer_name, customer_phone, customer_locality, customer_address, customer_notes,
        status, subtotal, shipping_cost, total, reserved_until)
     values ($1, $2, $3, $4, $5, 'reserved', $6, null, $7,
       now() + ($8::integer * interval '1 minute'))
     returning id, code, customer_name, customer_phone, customer_locality, customer_address,
       customer_notes, status, subtotal, shipping_cost, total, reserved_until, created_at`,
    [
      customer.name,
      customer.phone,
      customer.locality,
      customer.address,
      customer.notes ?? null,
      subtotal,
      total,
      reservationMinutes,
    ],
  );
  return result.rows[0];
}

export async function createOrderItem(client, orderId, item) {
  const result = await client.query(
    `insert into public.order_items
       (order_id, product_id, variant_id, product_name, variant_name, sku,
        unit_price, quantity, personalization_total, line_total)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id, order_id, product_id, variant_id, product_name, variant_name, sku,
       unit_price, quantity, personalization_total, line_total, created_at`,
    [
      orderId,
      item.product_id,
      item.variant_id,
      item.product_name,
      item.variant_name,
      item.sku,
      item.unit_price,
      item.quantity,
      item.personalization_total,
      item.line_total,
    ],
  );
  return result.rows[0];
}

export async function createOrderItemPersonalization(client, orderItemId, personalization) {
  const result = await client.query(
    `insert into public.order_item_personalizations
       (order_item_id, option_id, option_name, selected_value, customer_note, extra_price)
     values ($1, $2, $3, $4, $5, $6)
     returning id, order_item_id, option_id, option_name, selected_value, customer_note,
       extra_price, created_at`,
    [
      orderItemId,
      personalization.option_id,
      personalization.option_name,
      personalization.selected_value ?? null,
      personalization.customer_note ?? null,
      personalization.extra_price,
    ],
  );
  return result.rows[0];
}
