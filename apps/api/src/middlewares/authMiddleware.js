import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../helpers/AppError.js';

export function requireAdmin(req, _res, next) {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Autenticación requerida', 401, 'AUTH_REQUIRED'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: 'tierra-mate-api',
      audience: 'tierra-mate-admin',
    });

    req.admin = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(new AppError('Token inválido o vencido', 401, 'INVALID_TOKEN'));
  }
}
