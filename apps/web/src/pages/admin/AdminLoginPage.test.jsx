import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminLoginPage } from './AdminLoginPage.jsx';

describe('AdminLoginPage', () => {
  it('inicia sesión, conserva el token y navega al panel', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'jwt-prueba', admin: { id: '1', name: 'Tobías', email: 'admin@tienda.test' } } }),
    });
    const user = userEvent.setup();
    render(<AuthProvider><MemoryRouter initialEntries={['/admin/login']}><Routes><Route path="/admin/login" element={<AdminLoginPage />} /><Route path="/admin" element={<h1>Panel listo</h1>} /></Routes></MemoryRouter></AuthProvider>);

    await user.type(screen.getByLabelText('Email'), 'admin@tienda.test');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('heading', { name: 'Panel listo' })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('tierra-mate-admin-session')).token).toBe('jwt-prueba');
  });

  it('muestra el error devuelto por credenciales inválidas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' } }) });
    const user = userEvent.setup();
    render(<AuthProvider><MemoryRouter><AdminLoginPage /></MemoryRouter></AuthProvider>);
    await user.type(screen.getByLabelText('Email'), 'admin@tienda.test');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos');
  });
});
