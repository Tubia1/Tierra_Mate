import { query } from '../database/pool.js';

export const DEFAULT_STORE_SETTINGS = {
  store_name: 'Tierra Mate Shop',
  whatsapp_number: null,
  reservation_minutes: 30,
  currency: 'ARS',
  updated_at: null,
};

export async function get(client = { query }) {
  const result = await client.query(
    `select store_name, whatsapp_number, reservation_minutes, currency, updated_at
     from public.store_settings where id = 1`,
  );
  return result.rows[0] ?? DEFAULT_STORE_SETTINGS;
}

export async function update(values) {
  const keys = Object.keys(values);
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
  const result = await query(
    `update public.store_settings set ${assignments.join(', ')}
     where id = 1
     returning store_name, whatsapp_number, reservation_minutes, currency, updated_at`,
    keys.map((key) => values[key]),
  );
  return result.rows[0] ?? null;
}
