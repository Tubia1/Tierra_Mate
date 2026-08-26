import multer from 'multer';
import { AppError } from '../helpers/AppError.js';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function matchesFileSignature(file) {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new AppError('El archivo debe ser JPEG, PNG o WebP', 400, 'INVALID_IMAGE_TYPE'));
    }
    return callback(null, true);
  },
}).single('image');

export function imageUpload(req, res, next) {
  parser(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('La imagen supera el máximo de 5 MB', 413, 'IMAGE_TOO_LARGE'));
    }
    if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('El archivo debe enviarse en el campo image', 400, 'INVALID_IMAGE_FIELD'));
    }
    if (error) return next(error);
    if (!req.file) return next(new AppError('Debe enviarse una imagen', 400, 'IMAGE_REQUIRED'));
    if (!matchesFileSignature(req.file)) {
      return next(new AppError('El contenido del archivo no coincide con un formato permitido', 400, 'INVALID_IMAGE_TYPE'));
    }
    return next();
  });
}
