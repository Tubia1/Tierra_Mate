import { query } from '../database/pool.js';

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
     returning id, name, email, active, created_at`,
    [name, email, passwordHash],
  );
  return result.rows[0];
}
