import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminSettingsPage } from './AdminSettingsPage.jsx';

const session = { token: 'jwt', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } };
function renderPage() { sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify(session)); return render(<AuthProvider><MemoryRouter><AdminSettingsPage /></MemoryRouter></AuthProvider>); }

it('carga y guarda configuracion administrativa', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ data: { store_name: 'Tierra Mate Shop', whatsapp_number: '5491111111111', whatsapp_url: 'https://wa.me/5491111111111', reservation_minutes: 30, currency: 'ARS' } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { store_name: 'Tierra Nueva', whatsapp_number: '5491111111111', reservation_minutes: 45, currency: 'ARS' } }) });
  const user = userEvent.setup(); renderPage();
  const name = await screen.findByLabelText('Nombre de la tienda'); await user.clear(name); await user.type(name, 'Tierra Nueva');
  const minutes = screen.getByLabelText(/Duración de reservas/); await user.clear(minutes); await user.type(minutes, '45');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('Configuración guardada correctamente.')).toBeInTheDocument();
});

it('cierra sesion ante 401 al guardar', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ data: { store_name: 'Tierra', whatsapp_number: '5491111111111', reservation_minutes: 30, currency: 'ARS' } }) }).mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { code: 'ADMIN_INACTIVE', message: 'Cuenta inactiva' } }) });
  const user = userEvent.setup(); renderPage(); await screen.findByLabelText('Nombre de la tienda'); await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Cuenta inactiva'); expect(sessionStorage.getItem('tierra-mate-admin-session')).toBeNull();
});
