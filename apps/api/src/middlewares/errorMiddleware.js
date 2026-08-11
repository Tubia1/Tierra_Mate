import { ZodError } from 'zod';
import { AppError } from '../helpers/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos',
        details: error.flatten(),
      },
    });
  }

  if (error?.code === '23505') {
    return res.status(409).json({
      error: { code: 'DUPLICATE_RESOURCE', message: 'Ya existe un registro con esos datos' },
    });
  }

  if (error?.code === '23503') {
    return res.status(409).json({
      error: { code: 'RESOURCE_IN_USE', message: 'El registro está relacionado con otros datos' },
    });
  }

  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) console.error(error);

  return res.status(statusCode).json({
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Ocurrió un error interno' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
