import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { create } from '../src/repositories/adminUserRepository.js';
import { closePool } from '../src/database/pool.js';

const input = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
}).parse({
  name: process.env.ADMIN_BOOTSTRAP_NAME,
  email: process.env.ADMIN_BOOTSTRAP_EMAIL,
  password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
});

try {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const admin = await create({ name: input.name, email: input.email, passwordHash });
  console.log(`Administrador creado: ${admin.email}`);
} finally {
  await closePool();
}
