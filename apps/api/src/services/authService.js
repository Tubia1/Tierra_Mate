import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../helpers/AppError.js';
import * as adminRepository from '../repositories/adminUserRepository.js';

export async function login({ email, password }) {
  const admin = await adminRepository.findByEmail(email);
  const validPassword = admin && await bcrypt.compare(password, admin.password_hash);

  if (!admin || !validPassword || !admin.active) {
    throw new AppError('Email o contraseña incorrectos', 401, 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { email: admin.email },
    env.jwtSecret,
    {
      subject: String(admin.id),
      expiresIn: env.jwtExpiresIn,
      issuer: 'tierra-mate-api',
      audience: 'tierra-mate-admin',
    },
  );

  await adminRepository.updateLastLogin(admin.id);
  return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
}
