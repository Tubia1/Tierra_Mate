import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../admin/AuthContext.jsx';
import { Price } from '../../components/Price.jsx';
import { adminApi } from '../../services/api.js';
import { formatOrderDate, orderStatusLabel } from '../../utils/order.js';
import './AdminDashboardPage.css';

const shortcuts = [
  ['/admin/productos', '01', 'Productos', 'Crear, editar, destacar o desactivar productos.'],
  ['/admin/pedidos', '02', 'Pedidos', 'Consultar reservas y seguir las ventas de la tienda.'],
  ['/admin/inventario', '03', 'Inventario', 'Alertas de stock bajo e historial de movimientos.'],
  ['/admin/categorias', '04', 'Categorías', 'Ordenar y organizar el catálogo público.'],
  ['/admin/configuracion', '05', 'Configuración', 'Nombre, WhatsApp, reservas y moneda.'],
  ['/admin/usuarios', '06', 'Usuarios', 'Crear y administrar cuentas del equipo.'],
];

function MetricCard({ label, value, detail, money = false }) {
  return <article className="dashboard-metric"><h2>{label}</h2><strong>{money ? <Price value={value} /> : value}</strong>{detail && <p>{detail}</p>}</article>;
}

export function AdminDashboardPage() {
  const { session, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = session?.token;
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { const { data } = await adminApi.getDashboard(token); setDashboard(data); }
    catch (requestError) { setError(requestError.message); if (requestError.status === 401) logout(); }
    finally { setLoading(false); }
  }, [token, logout]);
  useEffect(() => { load(); }, [load]);
  const inventory = dashboard?.inventory;
  const hasAlerts = inventory && (inventory.low_stock_variants > 0 || inventory.out_of_stock_variants > 0);

  return <div className="dashboard-page">
    <header className="admin-heading dashboard-heading"><div><p className="eyebrow">Administración</p><h1>Resumen</h1><p>Pedidos, ventas confirmadas e inventario en una sola vista.</p></div><button className="button button--outline" type="button" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button></header>
    {loading && !dashboard && <div className="dashboard-loading" role="status" aria-live="polite" aria-busy="true"><span className="dashboard-spinner" aria-hidden="true" />Cargando dashboard…</div>}
    {error && <section className="state-card state-card--error" role="alert"><span aria-hidden="true">!</span><h2>No pudimos cargar el dashboard</h2><p>{error}</p><button className="button button--primary" type="button" onClick={load}>Reintentar</button></section>}
    {dashboard && <>
      <p className="dashboard-updated" aria-live="polite">Última actualización: {formatOrderDate(dashboard.generated_at, { timeZone: dashboard.timezone })}</p>
      <section className="dashboard-metrics" aria-label="Métricas principales">
        <MetricCard label="Reservas activas" value={dashboard.orders.active_reservations} /><MetricCard label="Confirmados" value={dashboard.orders.confirmed} /><MetricCard label="En preparación" value={dashboard.orders.preparing} /><MetricCard label="Completados hoy" value={dashboard.orders.completed_today} />
        <MetricCard label="Ventas confirmadas hoy" value={dashboard.sales.today_total} detail={`${dashboard.sales.today_count} pedidos`} money /><MetricCard label="Ventas confirmadas este mes" value={dashboard.sales.month_total} detail={`${dashboard.sales.month_count} pedidos`} money /><MetricCard label="Stock bajo" value={inventory.low_stock_variants} /><MetricCard label="Sin stock" value={inventory.out_of_stock_variants} />
      </section>
      <p className="dashboard-sales-note">Los valores corresponden a pedidos confirmados y no representan necesariamente pagos cobrados.</p>
      <section className={`dashboard-inventory-state ${hasAlerts ? 'dashboard-inventory-state--warning' : 'dashboard-inventory-state--ok'}`} aria-labelledby="inventory-state-title"><div><h2 id="inventory-state-title">{hasAlerts ? 'Hay alertas de inventario' : 'Inventario sin alertas'}</h2><p>{hasAlerts ? `${inventory.low_stock_variants} variantes tienen stock bajo; ${inventory.out_of_stock_variants} están sin stock.` : 'No hay variantes activas con stock bajo ni sin stock.'} El total de stock bajo incluye también las variantes sin stock.</p></div><Link className="button button--outline" to="/admin/inventario">Ver inventario</Link></section>
      <div className="dashboard-content">
        <details className="admin-panel dashboard-disclosure"><summary><span id="recent-orders-title">Pedidos recientes</span><span className="dashboard-disclosure__hint">Mostrar u ocultar</span></summary><div className="dashboard-disclosure__content"><div className="dashboard-disclosure__actions"><Link to="/admin/pedidos">Ver todos los pedidos</Link></div>{dashboard.recent_orders.length === 0 ? <p className="empty-inline">Todavía no hay pedidos registrados.</p> : <div className="admin-table-wrap"><table className="admin-table dashboard-orders-table" aria-labelledby="recent-orders-title"><thead><tr><th>Código</th><th>Cliente</th><th>Unidades</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{dashboard.recent_orders.map((order) => <tr key={order.id}><td><Link className="table-link" to={`/admin/pedidos/${order.id}`}>{order.code}</Link></td><td>{order.customer_name}</td><td>{order.total_units}</td><td><Price value={order.total} /></td><td><span className={`order-status order-status--${order.status}`}>{orderStatusLabel(order.status)}</span></td><td>{formatOrderDate(order.created_at)}</td></tr>)}</tbody></table></div>}</div></details>
        <section className="admin-panel" aria-labelledby="top-products-title"><div className="panel-title"><h2 id="top-products-title">Más vendidos del mes</h2></div>{dashboard.top_products_month.length === 0 ? <p className="empty-inline">No hay ventas confirmadas este mes.</p> : <ol className="dashboard-top-products">{dashboard.top_products_month.map((product, index) => <li key={product.product_id}><span className="dashboard-position" aria-label={`Posición ${index + 1}`}>{index + 1}</span><div>{product.product_exists ? <Link to={`/admin/productos/${product.product_id}`}>{product.product_name}</Link> : <strong>{product.product_name}</strong>}<small>{product.units_sold} unidades · {product.confirmed_orders} pedidos confirmados</small></div><Price value={product.sales_total} /></li>)}</ol>}</section>
      </div>
      <section aria-labelledby="shortcuts-title"><h2 id="shortcuts-title" className="dashboard-section-title">Accesos rápidos</h2><div className="admin-cards dashboard-shortcuts">{shortcuts.map(([to, number, title, description]) => <Link key={to} to={to}><span>{number}</span><h2>{title}</h2><p>{description}</p></Link>)}</div></section>
    </>}
  </div>;
}
