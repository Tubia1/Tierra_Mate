import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../cart/CartContext.jsx';
import { jsonResponse } from '../test/fixtures.js';
import { CartPage } from './CartPage.jsx';

const cartItem = {
  productId: '2', productName: 'Mate Imperial', variantId: '10', variantName: 'Negro',
  price: '25000', stock: 4, quantity: 2, imageUrl: 'https://images.example/main.webp',
  personalizations: [{ optionId: '20', name: 'Grabado', selectedValue: 'true', label: 'Sí', customerNote: 'Iniciales TM', extraPrice: '2500' }],
};

describe('CartPage', () => {
  it('crea la reserva con los datos del carrito y abre WhatsApp', async () => {
    localStorage.setItem('tierra-mate-cart', JSON.stringify([cartItem]));
    const result = {
      order: { code: 'TMS-000123', reserved_until: '2026-08-26T22:30:00.000Z' },
      whatsapp_url: 'https://wa.me/5491100000000?text=Pedido',
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(result));
    const popup = { opener: window, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup);
    const user = userEvent.setup();

    render(<CartProvider><MemoryRouter><CartPage /></MemoryRouter></CartProvider>);
    expect(screen.getByText('Mate Imperial')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nombre y apellido'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Teléfono'), '11 5555 1234');
    await user.type(screen.getByLabelText('Localidad'), 'Morón');
    await user.type(screen.getByLabelText('Dirección'), 'Belgrano 123');
    await user.click(screen.getByRole('button', { name: 'Reservar y abrir WhatsApp' }));

    expect(await screen.findByRole('heading', { name: 'TMS-000123' })).toBeInTheDocument();
    expect(popup.location.href).toBe(result.whatsapp_url);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toEqual({
      customer: { name: 'Ana Pérez', phone: '11 5555 1234', locality: 'Morón', address: 'Belgrano 123' },
      items: [{ variant_id: '10', quantity: 2, personalizations: [{ option_id: '20', selected_value: 'true', customer_note: 'Iniciales TM' }] }],
    });
    await waitFor(() => expect(localStorage.getItem('tierra-mate-cart')).toBe('[]'));
  });

  it('explica cuando cambió el stock y conserva el carrito', async () => {
    localStorage.setItem('tierra-mate-cart', JSON.stringify([cartItem]));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'INSUFFICIENT_STOCK', message: 'Stock insuficiente' } }),
    });
    const popup = { close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup);
    const user = userEvent.setup();

    render(<CartProvider><MemoryRouter><CartPage /></MemoryRouter></CartProvider>);
    await user.type(screen.getByLabelText('Nombre y apellido'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Teléfono'), '1155551234');
    await user.type(screen.getByLabelText('Localidad'), 'Morón');
    await user.type(screen.getByLabelText('Dirección'), 'Belgrano 123');
    await user.click(screen.getByRole('button', { name: 'Reservar y abrir WhatsApp' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cambió la disponibilidad/i);
    expect(screen.getByText('Mate Imperial')).toBeInTheDocument();
    expect(popup.close).toHaveBeenCalled();
  });
});
