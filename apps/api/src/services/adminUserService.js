import bcrypt from 'bcryptjs';
import { AppError } from '../helpers/AppError.js';
import * as defaultRepository from '../repositories/adminUserRepository.js';

const BCRYPT_COST = 12;

export function createAdminUserService(repository = defaultRepository, hash = (password) => bcrypt.hash(password, BCRYPT_COST)) {
  return {
    list: () => repository.list(),
    async create(data) {
      const passwordHash = await hash(data.password);
      try { return await repository.create({ name: data.name, email: data.email, passwordHash }); }
      catch (error) {
        if (error?.code === '23505') throw new AppError('Ya existe un administrador con ese email', 409, 'ADMIN_EMAIL_ALREADY_EXISTS');
        throw error;
      }
    },
    async setStatus(id, active, currentAdminId) {
      if (!active && String(id) === String(currentAdminId)) {
        throw new AppError('No podes desactivar tu propia cuenta', 409, 'CANNOT_DEACTIVATE_SELF');
      }
      const result = await repository.setStatusSafely(id, active);
      if (result === 'not_found') throw new AppError('Usuario administrativo no encontrado', 404, 'ADMIN_USER_NOT_FOUND');
      if (result === 'last_active') throw new AppError('No se puede desactivar el ultimo administrador activo', 409, 'LAST_ACTIVE_ADMIN');
      return result;
    },
    async resetPassword(id, password) {
      const passwordHash = await hash(password);
      const admin = await repository.updatePasswordById(id, passwordHash);
      if (!admin) throw new AppError('Usuario administrativo no encontrado', 404, 'ADMIN_USER_NOT_FOUND');
      return admin;
    },
  };
}

export const adminUserService = createAdminUserService();
