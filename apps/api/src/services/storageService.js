import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from '../helpers/AppError.js';

export function createStorageService({ client, bucket = env.supabaseStorageBucket } = {}) {
  const storageClient = client ?? createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const bucketClient = () => storageClient.storage.from(bucket);

  return {
    async upload(path, buffer, contentType) {
      const { error } = await bucketClient().upload(path, buffer, {
        upsert: false,
        contentType,
        cacheControl: '31536000',
      });
      if (error) throw new AppError('No se pudo subir la imagen', 502, 'STORAGE_UPLOAD_FAILED');
      return path;
    },
    publicUrl(path) {
      if (!path) return null;
      return bucketClient().getPublicUrl(path).data.publicUrl;
    },
    async remove(path) {
      const { error } = await bucketClient().remove([path]);
      if (error && error.statusCode !== 404 && error.status !== 404) {
        throw new AppError('No se pudo eliminar la imagen almacenada', 502, 'STORAGE_DELETE_FAILED');
      }
    },
  };
}

export const storageService = createStorageService();
