import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminUsersPage } from './AdminUsersPage.jsx';

const session = { token: 'jwt', admin: { id: '1', name: 'Dueño', email: 'dueno@test.com' } };
const users = [{ id: '1', name: 'Dueño', email: 'dueno@test.com', active: true, last_login_at: null }, { id: '2', name: 'Empleado', email: 'empleado@test.com', active: true, last_login_at: '2026-08-01T12:00:00Z' }];
function response(data, status = 200) { return { ok: status < 400, status, json: async () => status < 400 ? { data } : { error: data } }; }
function renderPage() { sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify(session)); return render(<AuthProvider><MemoryRouter><AdminUsersPage /></MemoryRouter></AuthProvider>); }

it('lista, crea, desactiva y restablece usuarios', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response(users))
    .mockResolvedValueOnce(response({ id: '3' }, 201)).mockResolvedValueOnce(response(users))
    .mockResolvedValueOnce(response({ ...users[1], active: false })).mockResolvedValueOnce(response([{ ...users[0] }, { ...users[1], active: false }]))
    .mockResolvedValueOnce(response(users[1]));
  const user = userEvent.setup(); renderPage(); expect((await screen.findAllByText('Empleado')).length).toBeGreaterThan(0);
  await user.type(screen.getByLabelText('Nombre'), 'Nuevo'); await user.type(screen.getByLabelText('Email'), 'nuevo@test.com'); await user.type(screen.getByLabelText('Contraseña inicial'), 'password-123'); await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  expect(await screen.findByText('Usuario creado correctamente.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Desactivar' })); expect(await screen.findByText('Usuario desactivado.')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Usuario'), '2'); await user.type(screen.getByLabelText('Nueva contraseña'), 'password-456'); await user.click(screen.getByRole('button', { name: 'Restablecer' }));
  expect(await screen.findByText('Contraseña restablecida.')).toBeInTheDocument(); expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
});

it('muestra errores y cierra sesion ante 401', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 'ADMIN_INACTIVE', message: 'Cuenta inactiva' }, 401));
  renderPage(); expect(await screen.findByRole('alert')).toHaveTextContent('Cuenta inactiva'); expect(sessionStorage.getItem('tierra-mate-admin-session')).toBeNull();
});
