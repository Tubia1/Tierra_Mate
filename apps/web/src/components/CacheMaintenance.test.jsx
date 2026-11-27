import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CacheMaintenance, clearLocalCache } from './CacheMaintenance.jsx';

it('limpia solo cachés de Tierra Mate y conserva sesión y carrito', async () => {
  localStorage.setItem('tierra-mate-cart', 'carrito');
  sessionStorage.setItem('tierra-mate-admin-session', 'sesión');
  const storage = { keys: vi.fn().mockResolvedValue(['tierra-mate-v1', 'otra-aplicacion']), delete: vi.fn().mockResolvedValue(true) };
  expect(await clearLocalCache(storage)).toEqual({ supported: true, deleted: 1 });
  expect(storage.delete).toHaveBeenCalledExactlyOnceWith('tierra-mate-v1');
  expect(localStorage.getItem('tierra-mate-cart')).toBe('carrito');
  expect(sessionStorage.getItem('tierra-mate-admin-session')).toBe('sesión');
});

it('informa cuando no hay API de caché disponible', async () => {
  render(<CacheMaintenance />);
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar caché local' }));
  expect(await screen.findByRole('status')).toHaveTextContent('no permite limpiar cachés');
});

it('propaga errores de limpieza sin informar éxito', async () => {
  await expect(clearLocalCache({ keys: () => Promise.reject(new Error('sin acceso')) })).rejects.toThrow('sin acceso');
});
