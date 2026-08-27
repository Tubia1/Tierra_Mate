import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { formatPrice } from '../utils/formatPrice.js';
import { jsonResponse, productDetail } from '../test/fixtures.js';
import { ProductDetailPage } from './ProductDetailPage.jsx';
import { CartProvider } from '../cart/CartContext.jsx';

describe('ProductDetailPage', () => {
  it('muestra el detalle y actualiza el precio con variante y personalización', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(productDetail));
    render(<CartProvider><MemoryRouter initialEntries={['/productos/2']}><Routes><Route path="/productos/:id" element={<ProductDetailPage />} /></Routes></MemoryRouter></CartProvider>);
    expect(await screen.findByRole('heading', { name: productDetail.name })).toBeInTheDocument();
    expect(screen.getByText(productDetail.description)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Suela/));
    expect(screen.getByTestId('total-price').textContent).toBe(formatPrice(28000));
    await userEvent.click(screen.getByLabelText(/Grabado/));
    expect(screen.getByTestId('total-price').textContent).toBe(formatPrice(30500));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));
    expect(screen.getByText(/se agregó al carrito/i)).toBeInTheDocument();
  });

  it('limita la cantidad al stock disponible después de descontar reservas vigentes', async () => {
    const reservedProduct = {
      ...productDetail,
      variants: [{
        ...productDetail.variants[0],
        name: 'Lacre rojo',
        stock_quantity: 8,
        available_stock: 0,
      }],
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(reservedProduct));
    render(<CartProvider><MemoryRouter initialEntries={['/productos/2']}><Routes><Route path="/productos/:id" element={<ProductDetailPage />} /></Routes></MemoryRouter></CartProvider>);

    expect(await screen.findByRole('heading', { name: reservedProduct.name })).toBeInTheDocument();
    expect(screen.getByText('0 disponibles')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
  });
});
