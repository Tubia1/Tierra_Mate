import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminProductDetailPage } from './AdminProductDetailPage.jsx';

const product = {
  id: '2', name: 'Mate Imperial', category_name: 'Mates', active: true,
  variants: [{ id: '3', sku: 'IMP-01', name: 'Marrón', color: 'Marrón', finish: null, price: '35000', stock_quantity: 8, low_stock_threshold: 2, active: true }],
  images: [], personalization_options: [],
};

describe('AdminProductDetailPage', () => {
  it('muestra variantes, imágenes y personalizaciones del producto', async () => {
    sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify({ token: 'jwt', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: product }) });
    render(<AuthProvider><MemoryRouter initialEntries={['/admin/productos/2']}><Routes><Route path="/admin/productos/:id" element={<AdminProductDetailPage />} /></Routes></MemoryRouter></AuthProvider>);
    expect(await screen.findByRole('heading', { name: 'Mate Imperial' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Variantes' })).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveAttribute('placeholder', 'Ej.: MATE-IMP-01');
    expect(screen.getByRole('heading', { name: 'Imágenes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personalizaciones' })).toBeInTheDocument();
    expect(screen.getByText('IMP-01 · Marrón')).toBeInTheDocument();
  });

  it('cierra una sesión inválida al intentar crear una variante', async () => {
    sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify({ token: 'jwt-vencido', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } }));
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: product }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { code: 'INVALID_TOKEN', message: 'Token inválido o vencido' } }) });
    render(<AuthProvider><MemoryRouter initialEntries={['/admin/productos/2']}><Routes><Route path="/admin/productos/:id" element={<AdminProductDetailPage />} /></Routes></MemoryRouter></AuthProvider>);
    await screen.findByRole('heading', { name: 'Mate Imperial' });
    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'BOM-ALP-01' } });
    fireEvent.change(screen.getAllByLabelText('Nombre')[0], { target: { value: 'Alpaca' } });
    fireEvent.change(screen.getByLabelText('Precio ARS'), { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar variante' }));
    await waitFor(() => expect(sessionStorage.getItem('tierra-mate-admin-session')).toBeNull());
  });
});
