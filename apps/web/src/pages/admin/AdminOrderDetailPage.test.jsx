import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminOrderDetailPage } from './AdminOrderDetailPage.jsx';

const session = { token: 'jwt-pedidos', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } };

function detail(overrides = {}) {
  return {
    id: '51', code: 'TMS-000051', customer_name: 'Ana López', customer_phone: '11 5555 1234',
    customer_locality: 'Córdoba', customer_address: 'San Martín 123', customer_notes: 'Tocar timbre B',
    status: 'reserved', subtotal: '45000.00', shipping_cost: null, total: '45000.00',
    reserved_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(), created_at: '2026-08-26T18:00:00.000Z',
    confirmed_at: null, completed_at: null, cancelled_at: null, cancellation_reason: null,
    items: [{
      id: '70', product_name: 'Mate Imperial', variant_name: 'Suela', sku: 'IMP-SUE',
      unit_price: '40000.00', quantity: 1, personalization_total: '5000.00', line_total: '45000.00',
      personalizations: [{ id: '80', option_name: 'Grabado', selected_value: 'Iniciales', customer_note: 'AL', extra_price: '5000.00' }],
    }],
    ...overrides,
  };
}

function response(data) {
  return { ok: true, status: 200, json: async () => ({ data }) };
}

function renderPage() {
  sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify(session));
  return render(<AuthProvider><MemoryRouter initialEntries={['/admin/pedidos/51']}><Routes><Route path="/admin/pedidos/:id" element={<AdminOrderDetailPage />} /></Routes></MemoryRouter></AuthProvider>);
}

describe('AdminOrderDetailPage', () => {
  it('muestra cliente, entrega, productos y personalizaciones', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(detail()));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'TMS-000051' })).toBeInTheDocument();
    expect(screen.getByText('San Martín 123')).toBeInTheDocument();
    expect(screen.getByText('Tocar timbre B')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mate Imperial' })).toBeInTheDocument();
    expect(screen.getByText('Valor: Iniciales')).toBeInTheDocument();
    expect(screen.getByText('Nota: AL')).toBeInTheDocument();
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/orders/51');
    expect(options.headers.Authorization).toBe('Bearer jwt-pedidos');
  });

  it('exige confirmación antes de descontar el stock físico', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(detail()))
      .mockResolvedValueOnce(response(detail({ status: 'confirmed', confirmed_at: '2026-08-26T18:10:00.000Z' })));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Confirmar venta' }));
    expect(screen.getByText(/descontará el stock físico/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar y descontar stock' }));

    expect(await screen.findByText('Estado: Confirmado')).toBeInTheDocument();
    const [url, options] = globalThis.fetch.mock.calls[1];
    expect(url).toContain('/orders/51/confirm');
    expect(options.method).toBe('PATCH');
    expect(options.headers.Authorization).toBe('Bearer jwt-pedidos');
  });

  it('envía el motivo al cancelar una reserva', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(detail()))
      .mockResolvedValueOnce(response(detail({ status: 'cancelled', cancellation_reason: 'El cliente desistió' })));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
    await user.type(screen.getByLabelText('Motivo opcional'), 'El cliente desistió');
    await user.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));

    expect(await screen.findByText('Estado: Cancelado')).toBeInTheDocument();
    const [, options] = globalThis.fetch.mock.calls[1];
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ reason: 'El cliente desistió' });
  });

  it('avanza un pedido confirmado a preparación', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(detail({ status: 'confirmed', confirmed_at: '2026-08-26T18:10:00.000Z' })))
      .mockResolvedValueOnce(response(detail({ status: 'preparing', confirmed_at: '2026-08-26T18:10:00.000Z' })));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Pasar a preparación' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar inicio de preparación' }));

    await waitFor(() => expect(screen.getByText('Estado: En preparación')).toBeInTheDocument());
    const [, options] = globalThis.fetch.mock.calls[1];
    expect(JSON.parse(options.body)).toEqual({ status: 'preparing' });
  });
});
