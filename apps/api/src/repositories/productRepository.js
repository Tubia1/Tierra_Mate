import { query, withTransaction } from '../database/pool.js';
import { buildUpdate } from '../helpers/sqlUpdate.js';

const productColumns = {
  category_id: 'category_id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  materials: 'materials',
  featured: 'featured',
  active: 'active',
};
const variantColumns = {
  sku: 'sku', name: 'name', color: 'color', finish: 'finish', price: 'price',
  stock_quantity: 'stock_quantity', low_stock_threshold: 'low_stock_threshold', active: 'active',
};
const imageColumns = {
  storage_path: 'storage_path', alt_text: 'alt_text', is_primary: 'is_primary', display_order: 'display_order',
};
const personalizationColumns = {
  name: 'name', input_type: 'input_type', choices: 'choices', extra_price: 'extra_price',
  required: 'required', allows_note: 'allows_note', display_order: 'display_order', active: 'active',
};

export async function categoryExists(id) {
  const result = await query('select exists(select 1 from public.categories where id = $1 and active = true)', [id]);
  return result.rows[0].exists;
}

export async function list({ cursor, limit, category_id, active, featured }) {
  const values = [];
  const conditions = ['p.deleted_at is null'];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (cursor) add('p.id > ?', cursor);
  if (category_id) add('p.category_id = ?', category_id);
  if (active !== undefined) add('p.active = ?', active);
  if (featured !== undefined) add('p.featured = ?', featured);
  values.push(limit + 1);

  const result = await query(
    `select
       p.id, p.category_id, p.name, p.slug, p.description, p.materials,
       p.featured, p.active, p.created_at, p.updated_at,
       c.name as category_name,
       min(v.price) filter (where v.active = true) as min_price,
       coalesce(sum(v.stock_quantity) filter (where v.active = true), 0)::integer as physical_stock,
       (select i.storage_path from public.product_images i
        where i.product_id = p.id
        order by i.is_primary desc, i.display_order asc, i.id asc limit 1) as primary_image
     from public.products p
     join public.categories c on c.id = p.category_id
     left join public.product_variants v on v.product_id = p.id
     where ${conditions.join(' and ')}
     group by p.id, c.id
     order by p.id asc
     limit $${values.length}`,
    values,
  );

  const hasMore = result.rows.length > limit;
  const items = hasMore ? result.rows.slice(0, limit) : result.rows;
  return { items, nextCursor: hasMore ? items.at(-1).id : null };
}

export async function findById(id) {
  const productResult = await query(
    `select p.*, c.name as category_name, c.slug as category_slug
     from public.products p
     join public.categories c on c.id = p.category_id
     where p.id = $1 and p.deleted_at is null`,
    [id],
  );
  const product = productResult.rows[0];
  if (!product) return null;

  const [variants, images, personalizations] = await Promise.all([
    query('select * from public.product_variants where product_id = $1 order by id', [id]),
    query('select * from public.product_images where product_id = $1 order by is_primary desc, display_order, id', [id]),
    query('select * from public.personalization_options where product_id = $1 order by display_order, id', [id]),
  ]);

  return {
    ...product,
    variants: variants.rows,
    images: images.rows,
    personalization_options: personalizations.rows,
  };
}

export async function create(data) {
  const result = await query(
    `insert into public.products
       (category_id, name, slug, description, materials, featured, active)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [data.category_id, data.name, data.slug, data.description ?? null, data.materials ?? null, data.featured, data.active],
  );
  return result.rows[0];
}

export async function update(id, data) {
  const { sets, values } = buildUpdate(data, productColumns);
  values.push(id);
  const result = await query(
    `update public.products set ${sets.join(', ')}
     where id = $${values.length} and deleted_at is null returning *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function softDelete(id) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `update public.products
       set active = false, deleted_at = now()
       where id = $1 and deleted_at is null returning *`,
      [id],
    );
    if (!result.rows[0]) return null;
    await client.query('update public.product_variants set active = false where product_id = $1', [id]);
    await client.query('update public.personalization_options set active = false where product_id = $1', [id]);
    return result.rows[0];
  });
}

async function clearPrimaryImage(productId, exceptId, client = { query }) {
  const params = [productId];
  let sql = 'update public.product_images set is_primary = false where product_id = $1';
  if (exceptId) {
    params.push(exceptId);
    sql += ' and id <> $2';
  }
  await client.query(sql, params);
}

export async function createVariant(productId, data) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `insert into public.product_variants
         (product_id, sku, name, color, finish, price, stock_quantity, low_stock_threshold, active)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [productId, data.sku, data.name, data.color ?? null, data.finish ?? null, data.price,
        data.stock_quantity, data.low_stock_threshold, data.active],
    );
    const variant = result.rows[0];

    if (variant.stock_quantity > 0) {
      await client.query(
        `insert into public.inventory_movements
           (variant_id, admin_user_id, movement_type, quantity_change, previous_stock, new_stock, note)
         values ($1, $2, 'initial_stock', $3, 0, $3, 'Stock inicial de la variante')`,
        [variant.id, data.admin_user_id ?? null, variant.stock_quantity],
      );
    }

    return variant;
  });
}

export async function updateVariant(productId, id, data) {
  const { sets, values } = buildUpdate(data, variantColumns);
  values.push(productId, id);
  const result = await query(
    `update public.product_variants set ${sets.join(', ')}
     where product_id = $${values.length - 1} and id = $${values.length} returning *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deactivateVariant(productId, id) {
  const result = await query(
    `update public.product_variants set active = false
     where product_id = $1 and id = $2 returning *`,
    [productId, id],
  );
  return result.rows[0] ?? null;
}

export async function adjustStock(productId, id, { newStock, adminUserId, note }) {
  return withTransaction(async (client) => {
    const currentResult = await client.query(
      `select * from public.product_variants
       where product_id = $1 and id = $2
       for update`,
      [productId, id],
    );
    const current = currentResult.rows[0];
    if (!current) return null;

    const previousStock = current.stock_quantity;
    const quantityChange = newStock - previousStock;
    if (quantityChange === 0) return current;

    const updatedResult = await client.query(
      `update public.product_variants
       set stock_quantity = $1
       where id = $2
       returning *`,
      [newStock, id],
    );

    await client.query(
      `insert into public.inventory_movements
         (variant_id, admin_user_id, movement_type, quantity_change, previous_stock, new_stock, note)
       values ($1, $2, 'manual_adjustment', $3, $4, $5, $6)`,
      [id, adminUserId, quantityChange, previousStock, newStock, note ?? null],
    );

    return updatedResult.rows[0];
  });
}

export async function createImage(productId, data) {
  return withTransaction(async (client) => {
    if (data.is_primary) await clearPrimaryImage(productId, null, client);
    const result = await client.query(
      `insert into public.product_images
         (product_id, storage_path, alt_text, is_primary, display_order)
       values ($1,$2,$3,$4,$5) returning *`,
      [productId, data.storage_path, data.alt_text ?? null, data.is_primary, data.display_order],
    );
    return result.rows[0];
  });
}

export async function updateImage(productId, id, data) {
  return withTransaction(async (client) => {
    if (data.is_primary) await clearPrimaryImage(productId, id, client);
    const { sets, values } = buildUpdate(data, imageColumns);
    values.push(productId, id);
    const result = await client.query(
      `update public.product_images set ${sets.join(', ')}
       where product_id = $${values.length - 1} and id = $${values.length} returning *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

export async function deleteImage(productId, id) {
  const result = await query(
    'delete from public.product_images where product_id = $1 and id = $2 returning *',
    [productId, id],
  );
  return result.rows[0] ?? null;
}

export async function createPersonalization(productId, data) {
  const result = await query(
    `insert into public.personalization_options
       (product_id, name, input_type, choices, extra_price, required, allows_note, display_order, active)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
    [productId, data.name, data.input_type, data.choices ? JSON.stringify(data.choices) : null,
      data.extra_price, data.required, data.allows_note, data.display_order, data.active],
  );
  return result.rows[0];
}

export async function updatePersonalization(productId, id, data) {
  const normalized = { ...data };
  if (normalized.choices !== undefined) normalized.choices = normalized.choices ? JSON.stringify(normalized.choices) : null;
  const { sets, values } = buildUpdate(normalized, personalizationColumns);
  values.push(productId, id);
  const result = await query(
    `update public.personalization_options set ${sets.join(', ')}
     where product_id = $${values.length - 1} and id = $${values.length} returning *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deactivatePersonalization(productId, id) {
  const result = await query(
    `update public.personalization_options set active = false
     where product_id = $1 and id = $2 returning *`,
    [productId, id],
  );
  return result.rows[0] ?? null;
}
