import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminOrdersPage } from './AdminOrdersPage.jsx';

const session = { token: 'jwt-pedidos', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } };

function order(overrides = {}) {
  return {
    id: '51',
    code: 'TM-000051',
    customer_name: 'Ana López',
    customer_phone: '11 5555 1234',
    customer_locality: 'Córdoba',
    status: 'reserved',
    total: '42500.00',
    total_units: 2,
    reserved_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    created_at: '2026-08-26T18:00:00.000Z',
    ...overrides,
  };
}

function response(data, nextCursor = null) {
  return { ok: true, status: 200, json: async () => ({ data, pagination: { next_cursor: nextCursor } }) };
}

function renderPage() {
  sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify(session));
  return render(<AuthProvider><MemoryRouter><AdminOrdersPage /></MemoryRouter></AuthProvider>);
}

describe('AdminOrdersPage', () => {
  it('muestra las reservas y aplica los filtros administrativos', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([order()]))
      .mockResolvedValueOnce(response([order({ status: 'confirmed', reserved_until: null })]));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('TM-000051')).toBeInTheDocument();
    expect(screen.getAllByText('Reservado')).toHaveLength(2);
    expect(screen.getByText(/Vence en [45] min/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado'), 'confirmed');
    await user.type(screen.getByLabelText('Teléfono exacto'), '11 5555 1234');
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-08-26' } });
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const [url, options] = globalThis.fetch.mock.calls[1];
    expect(url).toContain('status=confirmed');
    expect(url).toContain('customer_phone=11+5555+1234');
    expect(url).toContain('date_from=2026-08-01');
    expect(url).toContain('date_to=2026-08-26');
    expect(options.headers.Authorization).toBe('Bearer jwt-pedidos');
    expect(screen.getAllByText('Confirmado')).toHaveLength(2);
  });

  it('conserva los pedidos cargados al avanzar la paginación', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([order()], '40'))
      .mockResolvedValueOnce(response([order({ id: '40', code: 'TM-000040', status: 'completed', reserved_until: null })]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Cargar más pedidos' }));

    expect(await screen.findByText('TM-000040')).toBeInTheDocument();
    expect(screen.getByText('TM-000051')).toBeInTheDocument();
    expect(globalThis.fetch.mock.calls[1][0]).toContain('cursor=40');
  });
});
