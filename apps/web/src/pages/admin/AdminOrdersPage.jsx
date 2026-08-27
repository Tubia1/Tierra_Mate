import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../admin/AuthContext.jsx';
import { Price } from '../../components/Price.jsx';
import { adminApi } from '../../services/api.js';
import { formatOrderDate, ORDER_STATUSES, orderStatusLabel, reservationSummary } from '../../utils/order.js';

const emptyFilters = { status: '', customer_phone: '', date_from: '', date_to: '' };

export function AdminOrdersPage() {
  const { session, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  async function load({ query = appliedFilters, cursor, append = false } = {}) {
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const result = await adminApi.getOrders({ limit: 20, ...query, ...(cursor ? { cursor } : {}) }, session.token);
      setItems((current) => append ? [...current, ...result.data] : result.data);
      setNextCursor(result.pagination?.next_cursor ?? null);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401) logout();
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { load({ query: emptyFilters }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  function change(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      setError('La fecha final debe ser igual o posterior a la inicial.');
      return;
    }
    const nextFilters = { ...filters, customer_phone: filters.customer_phone.trim() };
    setAppliedFilters(nextFilters);
    load({ query: nextFilters });
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    load({ query: emptyFilters });
  }

  return <>
    <header className="admin-heading orders-heading"><div><p className="eyebrow">Ventas y reservas</p><h1>Pedidos</h1><p>Consultá reservas, ventas confirmadas y pedidos en preparación.</p></div><button className="button button--outline" type="button" onClick={() => load({ query: appliedFilters })} disabled={loading}>Actualizar</button></header>
    <section className="admin-panel orders-filters" aria-labelledby="orders-filters-title">
      <div className="panel-title"><h2 id="orders-filters-title">Filtrar pedidos</h2><button type="button" onClick={clearFilters}>Limpiar filtros</button></div>
      <form className="admin-form orders-filter-form" onSubmit={submit}>
        <label>Estado<select name="status" value={filters.status} onChange={change}><option value="">Todos los estados</option>{ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        <label>Teléfono exacto<input name="customer_phone" type="search" value={filters.customer_phone} onChange={change} maxLength="80" placeholder="Ej.: 11 5555 1234" /></label>
        <label>Desde<input name="date_from" type="date" value={filters.date_from} onChange={change} /></label>
        <label>Hasta<input name="date_to" type="date" value={filters.date_to} onChange={change} /></label>
        <button className="button button--primary" disabled={loading}>{loading ? 'Buscando…' : 'Aplicar filtros'}</button>
      </form>
      {error && <p className="form-error orders-error" role="alert">{error}</p>}
    </section>
    <section className="admin-panel admin-panel--wide orders-list" aria-labelledby="orders-list-title">
      <div className="panel-title"><h2 id="orders-list-title">Pedidos registrados</h2><span>{items.length} mostrados</span></div>
      {loading && <div className="orders-loading" aria-live="polite">Cargando pedidos…</div>}
      {!loading && items.length === 0 && !error && <p className="empty-inline">No hay pedidos que coincidan con los filtros.</p>}
      {!loading && items.length > 0 && <div className="admin-table-wrap"><table className="admin-table orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Unidades</th><th>Total</th><th>Estado</th><th>Reserva</th></tr></thead><tbody>{items.map((order) => { const reservation = reservationSummary(order, now); return <tr key={order.id}><td><Link className="table-link" to={`/admin/pedidos/${order.id}`}>{order.code}</Link><small>{formatOrderDate(order.created_at)}</small></td><td><strong>{order.customer_name}</strong><small>{order.customer_phone} · {order.customer_locality}</small></td><td>{order.total_units}</td><td><Price value={order.total} /></td><td><span className={`order-status order-status--${order.status}`}>{orderStatusLabel(order.status)}</span></td><td>{reservation ? <span className={`reservation-state reservation-state--${reservation.tone}`}>{reservation.label}</span> : <span className="orders-muted">—</span>}</td></tr>; })}</tbody></table></div>}
      {nextCursor && !error && <div className="orders-pagination"><button className="button button--outline" type="button" disabled={loadingMore} onClick={() => load({ query: appliedFilters, cursor: nextCursor, append: true })}>{loadingMore ? 'Cargando…' : 'Cargar más pedidos'}</button></div>}
    </section>
  </>;
}
