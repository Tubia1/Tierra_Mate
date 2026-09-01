import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../admin/AuthContext.jsx';
import { adminApi } from '../../services/api.js';

const MOVEMENT_LABELS = {
  initial_stock: 'Stock inicial', manual_adjustment: 'Ajuste manual',
  confirmed_sale: 'Venta confirmada', returned_stock: 'Devolución',
};
const emptyFilters = { movement_type: '', product_id: '', variant_id: '', admin_user_id: '', order_id: '' };

function stockState(item) {
  if (Number(item.stock_quantity) === 0) return 'Sin stock';
  if (Number(item.stock_quantity) < Number(item.low_stock_threshold)) return 'Debajo del nivel de alerta';
  return 'En el nivel de alerta';
}

export function AdminInventoryPage() {
  const { session, logout } = useAuth();
  const [alerts, setAlerts] = useState([]); const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState(emptyFilters); const [applied, setApplied] = useState(emptyFilters);
  const [nextCursor, setNextCursor] = useState(null); const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState('');

  function handleError(requestError) { setError(requestError.message); if (requestError.status === 401) logout(); }
  async function loadAll() {
    setLoading(true); setError('');
    try {
      const [lowStock, history] = await Promise.all([
        adminApi.getLowStock(session.token),
        adminApi.getInventoryMovements({ limit: 20, ...applied }, session.token),
      ]);
      setAlerts(lowStock.data); setMovements(history.data); setNextCursor(history.pagination?.next_cursor ?? null);
    } catch (requestError) { handleError(requestError); } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMovements(query, cursor, append = false) {
    append ? setLoadingMore(true) : setLoading(true); setError('');
    try {
      const result = await adminApi.getInventoryMovements({ limit: 20, ...query, ...(cursor ? { cursor } : {}) }, session.token);
      setMovements((current) => append ? [...current, ...result.data] : result.data);
      setNextCursor(result.pagination?.next_cursor ?? null);
    } catch (requestError) { handleError(requestError); } finally { setLoading(false); setLoadingMore(false); }
  }
  function submit(event) { event.preventDefault(); setApplied(filters); loadMovements(filters); }
  function clearFilters() { setFilters(emptyFilters); setApplied(emptyFilters); loadMovements(emptyFilters); }
  function change(event) { setFilters((current) => ({ ...current, [event.target.name]: event.target.value })); }

  return <>
    <header className="admin-heading"><div><p className="eyebrow">Stock físico</p><h1>Inventario</h1><p>Consultá alertas e historial sin modificar existencias.</p></div><button className="button button--outline" type="button" onClick={loadAll} disabled={loading}>Actualizar</button></header>
    {error && <div className="inventory-error" role="alert"><p className="form-error">{error}</p><button className="button button--outline" type="button" onClick={loadAll}>Reintentar</button></div>}
    {loading && <div className="orders-loading" role="status" aria-live="polite">Cargando inventario…</div>}
    {!loading && <>
      <section className="admin-panel inventory-section" aria-labelledby="low-stock-title"><div className="panel-title"><h2 id="low-stock-title">Alertas de stock bajo</h2><span>{alerts.length} variantes</span></div>
        {alerts.length === 0 ? <p className="empty-inline">No hay variantes con stock bajo.</p> : <div className="inventory-alerts">{alerts.map((item) => <article className="inventory-alert" key={item.variant_id}><div><strong>{item.product_name}</strong><p>{item.variant_name} · {item.sku}</p></div><span className="inventory-alert__state">{stockState(item)}</span><dl><div><dt>Stock físico</dt><dd>{item.stock_quantity}</dd></div><div><dt>Reservado</dt><dd>{item.reserved_units}</dd></div><div><dt>Disponible</dt><dd>{item.available_stock}</dd></div><div><dt>Nivel de alerta</dt><dd>{item.low_stock_threshold}</dd></div></dl>{Number(item.reserved_units) > 0 && <p className="form-hint">La disponibilidad está reducida por reservas vigentes.</p>}<Link className="table-link" to={`/admin/productos/${item.product_id}`}>Ver producto</Link></article>)}</div>}
      </section>
      <section className="admin-panel inventory-section" aria-labelledby="movements-title"><div className="panel-title"><h2 id="movements-title">Historial de movimientos</h2><span>{movements.length} mostrados</span></div>
        <form className="admin-form inventory-filters" onSubmit={submit}><label>Tipo<select name="movement_type" value={filters.movement_type} onChange={change}><option value="">Todos</option>{Object.entries(MOVEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Producto ID<input name="product_id" inputMode="numeric" value={filters.product_id} onChange={change} /></label><label>Variante ID<input name="variant_id" inputMode="numeric" value={filters.variant_id} onChange={change} /></label><label>Administrador ID<input name="admin_user_id" inputMode="numeric" value={filters.admin_user_id} onChange={change} /></label><label>Pedido ID<input name="order_id" inputMode="numeric" value={filters.order_id} onChange={change} /></label><div className="form-actions"><button className="button button--primary">Aplicar filtros</button><button className="button button--outline" type="button" onClick={clearFilters}>Limpiar</button></div></form>
        {movements.length === 0 ? <p className="empty-inline">No hay movimientos que coincidan con los filtros.</p> : <div className="admin-table-wrap"><table className="admin-table inventory-table"><thead><tr><th>Fecha</th><th>Producto / variante</th><th>Tipo</th><th>Cambio</th><th>Stock</th><th>Administrador</th><th>Pedido / nota</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.created_at).toLocaleString('es-AR')}</td><td><strong>{movement.product.name}</strong><small>{movement.variant.name} · {movement.variant.sku}</small></td><td><span className="status">{MOVEMENT_LABELS[movement.movement_type]}</span></td><td><strong className={Number(movement.quantity_change) > 0 ? 'quantity-positive' : 'quantity-negative'}>{Number(movement.quantity_change) > 0 ? '+' : ''}{movement.quantity_change}</strong></td><td>{movement.previous_stock} → {movement.new_stock}</td><td>{movement.admin ? <><strong>{movement.admin.name}</strong><small>{movement.admin.email}</small></> : 'Sin registrar'}</td><td>{movement.order ? <Link className="table-link" to={`/admin/pedidos/${movement.order.id}`}>{movement.order.code}</Link> : <span>Sin pedido</span>}<small>{movement.note || 'Sin nota'}</small></td></tr>)}</tbody></table></div>}
        {nextCursor && <div className="orders-pagination"><button className="button button--outline" type="button" disabled={loadingMore} onClick={() => loadMovements(applied, nextCursor, true)}>{loadingMore ? 'Cargando…' : 'Cargar más'}</button></div>}
      </section>
    </>}
  </>;
}
