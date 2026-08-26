import { render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'Imágenes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personalizaciones' })).toBeInTheDocument();
    expect(screen.getByText('IMP-01 · Marrón')).toBeInTheDocument();
  });
});
