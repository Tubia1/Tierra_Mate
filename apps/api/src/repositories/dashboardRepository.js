import { query } from '../database/pool.js';

export async function getDashboard(timezone, queryFn = query) {
  const result = await queryFn(
    `with boundaries as (
       select
         date_trunc('day', now() at time zone $1) at time zone $1 as day_start,
         (date_trunc('day', now() at time zone $1) + interval '1 day') at time zone $1 as day_end,
         date_trunc('month', now() at time zone $1) at time zone $1 as month_start,
         (date_trunc('month', now() at time zone $1) + interval '1 month') at time zone $1 as month_end
     ), order_metrics as (
       select
         count(*) filter (where o.status = 'reserved' and o.reserved_until > now())::integer as active_reservations,
         count(*) filter (where o.status = 'confirmed')::integer as confirmed,
         count(*) filter (where o.status = 'preparing')::integer as preparing,
         count(*) filter (where o.status = 'completed' and o.completed_at >= b.day_start and o.completed_at < b.day_end)::integer as completed_today,
         count(*) filter (where o.status in ('confirmed', 'preparing', 'completed') and o.confirmed_at >= b.day_start and o.confirmed_at < b.day_end)::integer as today_count,
         coalesce(sum(o.total) filter (where o.status in ('confirmed', 'preparing', 'completed') and o.confirmed_at >= b.day_start and o.confirmed_at < b.day_end), 0)::numeric(12,2) as today_total,
         count(*) filter (where o.status in ('confirmed', 'preparing', 'completed') and o.confirmed_at >= b.month_start and o.confirmed_at < b.month_end)::integer as month_count,
         coalesce(sum(o.total) filter (where o.status in ('confirmed', 'preparing', 'completed') and o.confirmed_at >= b.month_start and o.confirmed_at < b.month_end), 0)::numeric(12,2) as month_total
       from public.orders o cross join boundaries b
     ), inventory_metrics as (
       select
         count(*) filter (where v.stock_quantity <= v.low_stock_threshold)::integer as low_stock_variants,
         count(*) filter (where v.stock_quantity = 0)::integer as out_of_stock_variants
       from public.product_variants v
       join public.products p on p.id = v.product_id
       where v.active = true and p.active = true and p.deleted_at is null
     ), recent as (
       select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]'::jsonb) as items
       from (
         select o.id, o.code, o.customer_name, o.status, o.total, o.reserved_until,
           o.created_at, o.confirmed_at, coalesce(sum(oi.quantity), 0)::integer as total_units
         from public.orders o
         left join public.order_items oi on oi.order_id = o.id
         group by o.id
         order by o.id desc
         limit 8
       ) x
     ), top_products as (
       select coalesce(jsonb_agg(to_jsonb(x) order by x.units_sold desc, x.product_id asc), '[]'::jsonb) as items
       from (
         select oi.product_id, (array_agg(oi.product_name order by oi.id desc))[1] as product_name,
           sum(oi.quantity)::integer as units_sold,
           count(distinct oi.order_id)::integer as confirmed_orders,
           sum(oi.line_total)::numeric(12,2) as sales_total,
           bool_or(p.id is not null and p.deleted_at is null) as product_exists
         from public.order_items oi
         join public.orders o on o.id = oi.order_id
         cross join boundaries b
         left join public.products p on p.id = oi.product_id
         where o.status in ('confirmed', 'preparing', 'completed')
           and o.confirmed_at >= b.month_start and o.confirmed_at < b.month_end
         group by oi.product_id
         order by units_sold desc, oi.product_id asc
         limit 5
       ) x
     )
     select now() as generated_at, om.*, im.*, r.items as recent_orders,
       tp.items as top_products_month
     from order_metrics om cross join inventory_metrics im cross join recent r cross join top_products tp`,
    [timezone],
  );
  return result.rows[0];
}
