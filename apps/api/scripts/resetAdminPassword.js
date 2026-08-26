import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { updatePasswordByEmail } from '../src/repositories/adminUserRepository.js';
import { closePool } from '../src/database/pool.js';

const input = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
}).parse({
  email: process.env.ADMIN_RESET_EMAIL,
  password: process.env.ADMIN_RESET_PASSWORD,
});

try {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const admin = await updatePasswordByEmail(input.email, passwordHash);
  if (!admin) {
    console.error('No existe una cuenta administrativa con ese email.');
    process.exitCode = 1;
  } else if (!admin.active) {
    console.error('La contraseña fue actualizada, pero la cuenta está inactiva.');
    process.exitCode = 1;
  } else {
    console.log(`Contraseña actualizada para: ${admin.email}`);
  }
} finally {
  await closePool();
}
