import pg from 'pg';
import { env } from '../config/env.js';
import { AppError } from '../helpers/AppError.js';

const { Pool } = pg;
let pool;

export function getPool() {
  if (!env.databaseUrl) {
    throw new AppError('DATABASE_URL no está configurada', 503, 'DATABASE_NOT_CONFIGURED');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.dbPoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (error) => {
      console.error('Error inesperado en el pool de PostgreSQL:', error);
    });
  }

  return pool;
}

export function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  return executeTransaction(client, callback);
}

export async function executeTransaction(client, callback) {
  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
