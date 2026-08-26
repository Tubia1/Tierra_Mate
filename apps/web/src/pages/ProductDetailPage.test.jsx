import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { formatPrice } from '../utils/formatPrice.js';
import { jsonResponse, productDetail } from '../test/fixtures.js';
import { ProductDetailPage } from './ProductDetailPage.jsx';

describe('ProductDetailPage', () => {
  it('muestra el detalle y actualiza el precio con variante y personalización', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(productDetail));
    render(<MemoryRouter initialEntries={['/productos/2']}><Routes><Route path="/productos/:id" element={<ProductDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: productDetail.name })).toBeInTheDocument();
    expect(screen.getByText(productDetail.description)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Suela/));
    expect(screen.getByTestId('total-price').textContent).toBe(formatPrice(28000));
    await userEvent.click(screen.getByLabelText(/Grabado/));
    expect(screen.getByTestId('total-price').textContent).toBe(formatPrice(30500));
    expect(screen.getByText(/carrito y la compra por WhatsApp/i)).toBeInTheDocument();
  });
});
