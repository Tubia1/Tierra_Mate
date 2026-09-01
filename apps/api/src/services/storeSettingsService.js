import { AppError } from '../helpers/AppError.js';
import * as defaultRepository from '../repositories/storeSettingsRepository.js';

function publicSettings(settings) {
  const number = settings.whatsapp_number || null;
  return { ...settings, whatsapp_url: number ? `https://wa.me/${number}` : null };
}

export function createStoreSettingsService(repository = defaultRepository) {
  return {
    async get() { return publicSettings(await repository.get()); },
    async update(values) {
      const settings = await repository.update(values);
      if (!settings) throw new AppError('No existe la configuracion principal', 500, 'STORE_SETTINGS_NOT_FOUND');
      return publicSettings(settings);
    },
  };
}

export const storeSettingsService = createStoreSettingsService();
