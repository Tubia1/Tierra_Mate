import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../cart/CartContext.jsx';
import { jsonResponse } from '../test/fixtures.js';
import { CartPage } from './CartPage.jsx';
import { shopNotice } from '../utils/shopNotice.js';

vi.mock('../utils/shopNotice.js', () => ({ shopNotice: vi.fn() }));

const cartItem = {
  productId: '2', productName: 'Mate Imperial', variantId: '10', variantName: 'Negro',
  price: '25000', stock: 4, quantity: 2, imageUrl: 'https://images.example/main.webp',
  personalizations: [{ optionId: '20', name: 'Grabado', selectedValue: 'true', label: 'Sí', customerNote: 'Iniciales TM', extraPrice: '2500' }],
};

describe('CartPage', () => {
  beforeEach(() => vi.mocked(shopNotice).mockClear());
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
    expect(shopNotice).toHaveBeenCalledWith('Reserva creada', expect.stringContaining(result.order.code));
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
    expect(shopNotice).not.toHaveBeenCalled();
  });

  it('envía lineas separadas cuando se repite variant_id con grabados diferentes', async () => {
    localStorage.setItem('tierra-mate-cart', JSON.stringify([
      { ...cartItem, quantity: 1, personalizations: [{ ...cartItem.personalizations[0], customerNote: 'Tobias' }] },
      { ...cartItem, quantity: 1, personalizations: [{ ...cartItem.personalizations[0], customerNote: 'Matías' }] },
    ]));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse({
      order: { code: 'TMS-000124', reserved_until: '2026-08-26T22:30:00.000Z' },
      whatsapp_url: 'https://wa.me/5491100000000?text=Pedido',
    }));
    vi.spyOn(window, 'open').mockReturnValue({ opener: window, location: { href: '' }, close: vi.fn() });
    const user = userEvent.setup();
    render(<CartProvider><MemoryRouter><CartPage /></MemoryRouter></CartProvider>);

    expect(screen.getAllByText('Mate Imperial')).toHaveLength(2);
    await user.type(screen.getByLabelText('Nombre y apellido'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Teléfono'), '1155551234');
    await user.type(screen.getByLabelText('Localidad'), 'Morón');
    await user.type(screen.getByLabelText('Dirección'), 'Belgrano 123');
    await user.click(screen.getByRole('button', { name: 'Reservar y abrir WhatsApp' }));

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.items.map((item) => item.variant_id)).toEqual(['10', '10']);
    expect(request.items.map((item) => item.personalizations[0].customer_note)).toEqual(['Tobias', 'Matías']);
  });
});
