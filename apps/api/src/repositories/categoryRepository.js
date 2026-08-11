import { query } from '../database/pool.js';
import { buildUpdate } from '../helpers/sqlUpdate.js';

const updateColumns = {
  name: 'name',
  slug: 'slug',
  display_order: 'display_order',
  active: 'active',
};

export async function list({ cursor, limit, active }) {
  const values = [];
  const conditions = [];

  if (cursor) {
    values.push(cursor);
    conditions.push(`id > $${values.length}`);
  }
  if (active !== undefined) {
    values.push(active);
    conditions.push(`active = $${values.length}`);
  }

  values.push(limit + 1);
  const result = await query(
    `select id, name, slug, display_order, active, created_at, updated_at
     from public.categories
     ${conditions.length ? `where ${conditions.join(' and ')}` : ''}
     order by id asc
     limit $${values.length}`,
    values,
  );

  const hasMore = result.rows.length > limit;
  const items = hasMore ? result.rows.slice(0, limit) : result.rows;
  return { items, nextCursor: hasMore ? items.at(-1).id : null };
}

export async function findById(id) {
  const result = await query(
    `select id, name, slug, display_order, active, created_at, updated_at
     from public.categories where id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function create(data) {
  const result = await query(
    `insert into public.categories (name, slug, display_order, active)
     values ($1, $2, $3, $4)
     returning *`,
    [data.name, data.slug, data.display_order, data.active],
  );
  return result.rows[0];
}

export async function update(id, data) {
  const { sets, values } = buildUpdate(data, updateColumns);
  values.push(id);
  const result = await query(
    `update public.categories set ${sets.join(', ')}
     where id = $${values.length}
     returning *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deactivate(id) {
  const result = await query(
    `update public.categories set active = false where id = $1 returning *`,
    [id],
  );
  return result.rows[0] ?? null;
}
