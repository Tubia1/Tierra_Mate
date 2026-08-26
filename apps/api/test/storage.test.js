import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorageService } from '../src/services/storageService.js';

function createClient({ uploadError = null, removeError = null } = {}) {
  const calls = { upload: [], remove: [], publicUrl: [] };
  const bucket = {
    upload: async (...args) => { calls.upload.push(args); return { data: {}, error: uploadError }; },
    remove: async (...args) => { calls.remove.push(args); return { data: [], error: removeError }; },
    getPublicUrl: (path) => {
      calls.publicUrl.push(path);
      return { data: { publicUrl: `https://storage.example/${path}` } };
    },
  };
  return { calls, storage: { from: () => bucket } };
}

test('storageService carga sin upsert y con metadatos de caché y contenido', async () => {
  const client = createClient();
  const service = createStorageService({ client, bucket: 'product-images' });
  const buffer = Buffer.from('image');
  await service.upload('products/2/image.webp', buffer, 'image/webp');
  assert.deepEqual(client.calls.upload[0], [
    'products/2/image.webp',
    buffer,
    { upsert: false, contentType: 'image/webp', cacheControl: '31536000' },
  ]);
});

test('storageService permite que un objeto ausente sea limpiado de PostgreSQL', async () => {
  const client = createClient({ removeError: { statusCode: 404, message: 'not found' } });
  const service = createStorageService({ client, bucket: 'product-images' });
  await assert.doesNotReject(service.remove('products/2/missing.webp'));
  assert.deepEqual(client.calls.remove[0], [['products/2/missing.webp']]);
});

test('storageService genera la URL pública sin persistirla', () => {
  const client = createClient();
  const service = createStorageService({ client, bucket: 'product-images' });
  assert.equal(service.publicUrl('products/2/image.webp'), 'https://storage.example/products/2/image.webp');
});
