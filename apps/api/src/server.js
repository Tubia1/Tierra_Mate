import { app } from './app.js';
import { env } from './config/env.js';
import { closePool } from './database/pool.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL es obligatoria para iniciar el servidor');
}

const server = app.listen(env.port, () => {
  console.log(`Tierra Mate API escuchando en http://localhost:${env.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
