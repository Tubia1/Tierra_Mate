import { AppError } from './AppError.js';

export function buildUpdate(data, columnMap, startAt = 1) {
  const entries = Object.entries(data).filter(
    ([key, value]) => value !== undefined && columnMap[key],
  );

  if (entries.length === 0) {
    throw new AppError('No hay campos válidos para actualizar', 400, 'EMPTY_UPDATE');
  }

  return {
    sets: entries.map(([key], index) => `${columnMap[key]} = $${startAt + index}`),
    values: entries.map(([, value]) => value),
  };
}
