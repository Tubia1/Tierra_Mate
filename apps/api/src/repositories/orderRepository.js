import { query, withTransaction } from '../database/pool.js';

export async function list({ cursor, limit, status, customer_phone }) {
  const values = [];
  const conditions = [];
  const addCondition = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (cursor) addCondition('o.id < ?', cursor);
  if (status) addCondition('o.status = ?', status);
  if (customer_phone) addCondition('o.customer_phone = ?', customer_phone);
  values.push(limit + 1);

  const result = await query(
    `select
       o.id, o.code, o.customer_name, o.customer_phone, o.customer_locality,
       o.status, o.subtotal, o.shipping_cost, o.total, o.reserved_until,
       o.created_at, coalesce(sum(oi.quantity), 0)::integer as total_units
     from public.orders o
     left join public.order_items oi on oi.order_id = o.id
     ${conditions.length ? `where ${conditions.join(' and ')}` : ''}
     group by o.id
     order by o.id desc
     limit $${values.length}`,
    values,
  );

  const hasMore = result.rows.length > limit;
  const items = hasMore ? result.rows.slice(0, limit) : result.rows;
  return { items, nextCursor: hasMore ? items.at(-1).id : null };
}

export async function findById(id) {
  const orderResult = await query('select * from public.orders where id = $1', [id]);
  const order = orderResult.rows[0];
  if (!order) return null;

  const itemsResult = await query(
    `select id, order_id, product_id, variant_id, product_name, variant_name, sku,
       unit_price, quantity, personalization_total, line_total, created_at
     from public.order_items
     where order_id = $1
     order by id asc`,
    [id],
  );

  const itemIds = itemsResult.rows.map((item) => item.id);
  let personalizations = [];
  if (itemIds.length > 0) {
    const personalizationsResult = await query(
      `select id, order_item_id, option_id, option_name, selected_value,
         customer_note, extra_price, created_at
       from public.order_item_personalizations
       where order_item_id = any($1::bigint[])
       order by order_item_id asc, id asc`,
      [itemIds],
    );
    personalizations = personalizationsResult.rows;
  }

  const personalizationsByItem = new Map();
  for (const personalization of personalizations) {
    const key = String(personalization.order_item_id);
    const itemPersonalizations = personalizationsByItem.get(key) ?? [];
    itemPersonalizations.push(personalization);
    personalizationsByItem.set(key, itemPersonalizations);
  }

  return {
    ...order,
    items: itemsResult.rows.map((item) => ({
      ...item,
      personalizations: personalizationsByItem.get(String(item.id)) ?? [],
    })),
  };
}

export function transaction(callback) {
  return withTransaction(callback);
}

export async function lockOrder(client, id) {
  const result = await client.query(
    `select o.*, (o.reserved_until <= now()) as reservation_expired
     from public.orders o
     where o.id = $1
     for update`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function cancelOrder(client, id, reason) {
  const result = await client.query(
    `update public.orders
     set status = 'cancelled', cancelled_at = now(), cancellation_reason = $2
     where id = $1 and status = 'reserved'
     returning *`,
    [id, reason],
  );
  return result.rows[0];
}

export async function markOrderExpired(client, id) {
  const result = await client.query(
    `update public.orders
     set status = 'expired'
     where id = $1 and status = 'reserved'
     returning *`,
    [id],
  );
  return result.rows[0];
}

export async function expireReservations(client) {
  const result = await client.query(
    `update public.orders
     set status = 'expired'
     where status = 'reserved'
       and reserved_until <= now()
     returning id, code`,
  );
  return result.rows;
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
