import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../helpers/AppError.js';
import * as adminRepository from '../repositories/adminUserRepository.js';

let identityResolver = adminRepository.findActiveIdentityById;
export function setAdminIdentityResolver(resolver) { identityResolver = resolver; }

export function createRequireAdmin(findIdentity = adminRepository.findActiveIdentityById) {
  return async function requireAdminMiddleware(req, _res, next) {
    const authorization = req.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) return next(new AppError('Autenticación requerida', 401, 'AUTH_REQUIRED'));
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { issuer: 'tierra-mate-api', audience: 'tierra-mate-admin' });
    } catch {
      return next(new AppError('Token inválido o vencido', 401, 'INVALID_TOKEN'));
    }
    try {
      const admin = await findIdentity(payload.sub);
      if (!admin || !admin.active || admin.email.toLowerCase() !== String(payload.email).toLowerCase()) {
        return next(new AppError('La cuenta administrativa está inactiva o ya no existe', 401, 'ADMIN_INACTIVE'));
      }
      req.admin = { id: payload.sub, email: payload.email };
      return next();
    } catch (error) { return next(error); }
  };
}

export const requireAdmin = createRequireAdmin((id) => identityResolver(id));
