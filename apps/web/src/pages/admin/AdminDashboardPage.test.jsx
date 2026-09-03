import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../admin/AuthContext.jsx';
import { StoreSettingsContext } from '../../store/StoreSettingsContext.jsx';
import { AdminDashboardPage } from './AdminDashboardPage.jsx';

const session = { token: 'jwt-dashboard', admin: { id: '1', name: 'Admin', email: 'admin@test.com' } };
const data = { generated_at: '2026-09-02T15:00:00.000Z', timezone: 'America/Argentina/Buenos_Aires', orders: { active_reservations: 3, confirmed: 2, preparing: 1, completed_today: 4 }, sales: { today_count: 2, today_total: '70000.00', month_count: 15, month_total: '525000.00' }, inventory: { low_stock_variants: 4, out_of_stock_variants: 1 }, recent_orders: [{ id: '15', code: 'TMS-000015', customer_name: 'Cliente', status: 'confirmed', total: '70000.00', total_units: 2, created_at: '2026-09-02T12:00:00Z' }], top_products_month: [{ product_id: '2', product_name: 'Mate Imperial', units_sold: 8, confirmed_orders: 5, sales_total: '280000.00', product_exists: true }, { product_id: '99', product_name: 'Mate histórico', units_sold: 2, confirmed_orders: 1, sales_total: '20000.00', product_exists: false }] };
const ok = (value = data) => ({ ok: true, status: 200, json: async () => ({ data: value }) });
function renderPage(currency = 'ARS') { sessionStorage.setItem('tierra-mate-admin-session', JSON.stringify(session)); return render(<StoreSettingsContext.Provider value={{ currency }}><AuthProvider><MemoryRouter><AdminDashboardPage /></MemoryRouter></AuthProvider></StoreSettingsContext.Provider>); }

it('muestra carga, métricas reales, moneda, pedidos, productos, alertas y enlaces', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok()); renderPage('USD');
  expect(screen.getByRole('status')).toHaveTextContent('Cargando dashboard');
  expect(await screen.findByText('Reservas activas')).toBeInTheDocument();
  expect(screen.getAllByText(/US\$\s*70[.,]000/)).toHaveLength(2);
  expect(screen.getByText(/no representan necesariamente pagos cobrados/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'TMS-000015' })).toHaveAttribute('href', '/admin/pedidos/15');
  expect(screen.getByRole('link', { name: 'Mate Imperial' })).toHaveAttribute('href', '/admin/productos/2');
  expect(screen.getByText('Mate histórico').closest('a')).toBeNull();
  expect(screen.getByText('Hay alertas de inventario')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver inventario' })).toHaveAttribute('href', '/admin/inventario');
  expect(screen.getByRole('link', { name: 'Ver todos los pedidos' })).toHaveAttribute('href', '/admin/pedidos');
  const recentOrders = screen.getByText('Pedidos recientes').closest('details');
  expect(recentOrders).not.toHaveAttribute('open');
  await userEvent.click(screen.getByText('Pedidos recientes'));
  expect(recentOrders).toHaveAttribute('open');
});

it('muestra error, reintenta y el botón actualizar vuelve a consultar', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'Falla temporal' } }) }).mockResolvedValue(ok());
  const user = userEvent.setup(); renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('Falla temporal');
  await user.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Reservas activas')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Actualizar' }));
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(3));
});

it('cierra sesión ante 401', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'Cuenta inactiva' } }) }); renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('Cuenta inactiva');
  expect(sessionStorage.getItem('tierra-mate-admin-session')).toBeNull();
});

it('renderiza datos vacíos y estado positivo sin errores', async () => {
  const empty = { ...data, orders: { active_reservations: 0, confirmed: 0, preparing: 0, completed_today: 0 }, sales: { today_count: 0, today_total: '0.00', month_count: 0, month_total: '0.00' }, inventory: { low_stock_variants: 0, out_of_stock_variants: 0 }, recent_orders: [], top_products_month: [] };
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(empty)); renderPage();
  expect(await screen.findByText('Inventario sin alertas')).toBeInTheDocument();
  expect(screen.getByText('Todavía no hay pedidos registrados.')).toBeInTheDocument();
  expect(screen.getByText('No hay ventas confirmadas este mes.')).toBeInTheDocument();
});
