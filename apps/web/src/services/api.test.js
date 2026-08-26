import { adminApi } from './api.js';

describe('adminApi', () => {
  it('envía el JWT y el JSON al crear una categoría', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: '1', name: 'Mates' } }),
    });

    await adminApi.createCategory({ name: 'Mates', display_order: 0, active: true }, 'jwt-prueba');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/categories'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-prueba', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: 'Mates', display_order: 0, active: true }),
      }),
    );
  });

  it('envía imágenes como FormData sin fijar manualmente Content-Type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    const form = new FormData();
    form.set('image', new File(['imagen'], 'mate.webp', { type: 'image/webp' }));
    await adminApi.uploadImage('2', form, 'jwt-prueba');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/products/2/images/upload'), expect.objectContaining({ method: 'POST', body: form, headers: { Authorization: 'Bearer jwt-prueba' } }));
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
});
