import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { AdminInventoryPage } from './AdminInventoryPage.jsx';
import { routes } from '../../App.jsx';

const session = { token: 'jwt-inventario', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } };
const alert = { product_id: '2', product_name: 'Mate Imperial', variant_id: '4', sku: 'IMP-NEGRO', variant_name: 'Negro', stock_quantity: 2, reserved_units: 1, available_stock: 1, low_stock_threshold: 3 };
const movement = { id: '15', movement_type: 'confirmed_sale', quantity_change: -2, previous_stock: 10, new_stock: 8, note: 'Venta confirmada', created_at: '2026-09-01T12:00:00Z', product: { id: '2', name: 'Mate Imperial', active: true }, variant: { id: '4', sku: 'IMP-NEGRO', name: 'Negro', active: true }, order: { id: '15', code: 'TMS-000015', status: 'confirmed' }, admin: { id: '1', name: 'Tobias', email: 'admin@ejemplo.com' } };
function response(data, nextCursor = null) { return { ok: true, status: 200, json: async () => ({ data, pagination: { next_cursor: nextCursor } }) }; }
function renderPage() { sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify(session)); return render(<AuthProvider><MemoryRouter><AdminInventoryPage /></MemoryRouter></AuthProvider>); }

it('la ruta de inventario permanece dentro del arbol protegido', () => {
  const protectedBranch = routes.find((route) => route.element?.type?.name === 'ProtectedRoute');
  const inventoryRoute = protectedBranch.children[0].children.find((route) => route.path === 'inventario');
  expect(inventoryRoute).toBeTruthy();
});

it('muestra carga y luego estados vacios', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([])); renderPage();
  expect(screen.getByRole('status')).toHaveTextContent('Cargando inventario');
  expect(await screen.findByText('No hay variantes con stock bajo.')).toBeInTheDocument();
  expect(screen.getByText('No hay movimientos que coincidan con los filtros.')).toBeInTheDocument();
});

it('renderiza alertas, reservas, movimientos, etiquetas y enlaces', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response([alert])).mockResolvedValueOnce(response([movement], '15'));
  renderPage();
  expect(await screen.findByText('Debajo del nivel de alerta')).toBeInTheDocument();
  expect(screen.getByText('La disponibilidad está reducida por reservas vigentes.')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Venta confirmada' })).toBeInTheDocument();
  expect(screen.getByText('-2')).toBeInTheDocument(); expect(screen.getByText('10 → 8')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver producto' })).toHaveAttribute('href', '/admin/productos/2');
  expect(screen.getByRole('link', { name: 'TMS-000015' })).toHaveAttribute('href', '/admin/pedidos/15');
});

it('aplica filtro por tipo y carga la pagina siguiente', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(response([alert])).mockResolvedValueOnce(response([movement], '15'))
    .mockResolvedValueOnce(response([movement], '15'))
    .mockResolvedValueOnce(response([{ ...movement, id: '14', movement_type: 'manual_adjustment', quantity_change: 5, order: null }], null));
  const user = userEvent.setup(); renderPage(); await screen.findByText('-2');
  await user.selectOptions(screen.getByLabelText('Tipo'), 'confirmed_sale');
  await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(globalThis.fetch.mock.calls[2][0]).toContain('movement_type=confirmed_sale'));
  await user.click(screen.getByRole('button', { name: 'Cargar más' }));
  expect(await screen.findByText('+5')).toBeInTheDocument();
  expect(globalThis.fetch.mock.calls[3][0]).toContain('cursor=15');
  expect(screen.getByRole('cell', { name: 'Ajuste manual' })).toBeInTheDocument();
});

it('muestra error, permite reintentar y cierra sesion ante 401', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: 'ADMIN_INACTIVE', message: 'Cuenta inactiva' } }) });
  renderPage(); expect(await screen.findByRole('alert')).toHaveTextContent('Cuenta inactiva');
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  expect(sessionStorage.getItem('tierra-mate-admin-session')).toBeNull();
});
