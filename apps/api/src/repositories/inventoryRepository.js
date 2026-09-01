import { query } from '../database/pool.js';

export async function listMovements(filters, queryFn = query) {
  const values = [];
  const conditions = [];
  const add = (column, value) => {
    if (value === undefined) return;
    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  };
  if (filters.cursor !== undefined) {
    values.push(filters.cursor);
    conditions.push(`im.id < $${values.length}`);
  }
  add('im.movement_type', filters.movement_type);
  add('p.id', filters.product_id);
  add('im.variant_id', filters.variant_id);
  add('im.order_id', filters.order_id);
  add('im.admin_user_id', filters.admin_user_id);
  values.push(filters.limit + 1);

  const result = await queryFn(
    `select
       im.id, im.movement_type, im.quantity_change, im.previous_stock,
       im.new_stock, im.note, im.created_at,
       p.id as product_id, p.name as product_name, p.active as product_active,
       v.id as variant_id, v.sku, v.name as variant_name, v.color, v.finish,
       v.active as variant_active,
       o.id as order_id, o.code as order_code, o.status as order_status,
       au.id as admin_id, au.name as admin_name, au.email as admin_email
     from public.inventory_movements im
     join public.product_variants v on v.id = im.variant_id
     join public.products p on p.id = v.product_id
     left join public.orders o on o.id = im.order_id
     left join public.admin_users au on au.id = im.admin_user_id
     ${conditions.length ? `where ${conditions.join(' and ')}` : ''}
     order by im.id desc
     limit $${values.length}`,
    values,
  );
  return result.rows;
}

export async function listLowStock(queryFn = query) {
  const result = await queryFn(
    `select
       p.id as product_id, p.name as product_name,
       v.id as variant_id, v.sku, v.name as variant_name, v.color, v.finish,
       v.stock_quantity, coalesce(r.reserved_units, 0)::integer as reserved_units,
       greatest(v.stock_quantity - coalesce(r.reserved_units, 0), 0)::integer as available_stock,
       v.low_stock_threshold
     from public.product_variants v
     join public.products p on p.id = v.product_id
     left join (
       select oi.variant_id, sum(oi.quantity)::integer as reserved_units
       from public.order_items oi
       join public.orders o on o.id = oi.order_id
       where o.status = 'reserved' and o.reserved_until > now()
       group by oi.variant_id
     ) r on r.variant_id = v.id
     where v.active = true
       and p.active = true
       and p.deleted_at is null
       and v.stock_quantity <= v.low_stock_threshold
     order by v.stock_quantity asc, p.name asc, v.name asc, v.id asc`,
  );
  return result.rows;
}
