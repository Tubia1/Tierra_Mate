import { query, withTransaction } from '../database/pool.js';

const PUBLIC_COLUMNS = 'id, name, email, active, last_login_at, created_at, updated_at';

export async function list() {
  const result = await query(`select ${PUBLIC_COLUMNS} from public.admin_users order by active desc, name asc, id asc`);
  return result.rows;
}

export async function findActiveIdentityById(id) {
  const result = await query('select id, email, active from public.admin_users where id = $1 limit 1', [id]);
  return result.rows[0] ?? null;
}

export async function findByEmail(email) {
  const result = await query(
    `select id, name, email, password_hash, active
     from public.admin_users
     where lower(email) = lower($1)
     limit 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function updateLastLogin(id) {
  await query('update public.admin_users set last_login_at = now() where id = $1', [id]);
}

export async function create({ name, email, passwordHash }) {
  const result = await query(
    `insert into public.admin_users (name, email, password_hash)
     values ($1, lower($2), $3)
     returning ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash],
  );
  return result.rows[0];
}

export async function setStatusSafely(id, active) {
  return withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock($1)', [83001]);
    const targetResult = await client.query(`select ${PUBLIC_COLUMNS} from public.admin_users where id = $1 for update`, [id]);
    if (!targetResult.rows[0]) return 'not_found';
    if (!active && targetResult.rows[0].active) {
      const countResult = await client.query('select count(*)::integer as count from public.admin_users where active = true');
      if (countResult.rows[0].count <= 1) return 'last_active';
    }
    const result = await client.query(`update public.admin_users set active = $2 where id = $1 returning ${PUBLIC_COLUMNS}`, [id, active]);
    return result.rows[0];
  });
}

export async function updatePasswordById(id, passwordHash) {
  const result = await query(`update public.admin_users set password_hash = $2 where id = $1 returning ${PUBLIC_COLUMNS}`, [id, passwordHash]);
  return result.rows[0] ?? null;
}

export async function updatePasswordByEmail(email, passwordHash) {
  const result = await query(
    `update public.admin_users
     set password_hash = $2
     where lower(email) = lower($1)
     returning id, name, email, active, updated_at`,
    [email, passwordHash],
  );
  return result.rows[0] ?? null;
}
