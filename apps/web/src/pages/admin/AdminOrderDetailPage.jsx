import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../admin/AuthContext.jsx';
import { Price } from '../../components/Price.jsx';
import { adminApi } from '../../services/api.js';
import { formatOrderDate, orderStatusLabel, reservationSummary } from '../../utils/order.js';

function DetailRow({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

function OrderItem({ item }) {
  return <article className="order-item-detail">
    <div className="order-item-detail__heading">
      <div><h3>{item.product_name}</h3><p>{item.variant_name} · SKU {item.sku}</p></div>
      <strong>{item.quantity} {Number(item.quantity) === 1 ? 'unidad' : 'unidades'}</strong>
    </div>
    <dl className="order-item-detail__prices">
      <DetailRow label="Precio unitario"><Price value={item.unit_price} /></DetailRow>
      <DetailRow label="Personalizaciones"><Price value={item.personalization_total} /></DetailRow>
      <DetailRow label="Total de la línea"><Price value={item.line_total} /></DetailRow>
    </dl>
    {item.personalizations?.length > 0 && <div className="order-personalizations">
      <h4>Personalizaciones</h4>
      {item.personalizations.map((entry) => <div key={entry.id}>
        <strong>{entry.option_name}</strong>
        {entry.selected_value && <span>Valor: {entry.selected_value}</span>}
        {entry.customer_note && <span>Nota: {entry.customer_note}</span>}
        {Number(entry.extra_price) > 0 && <small>Adicional unitario: <Price value={entry.extra_price} /></small>}
      </div>)}
    </div>}
  </article>;
}

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const { session, logout } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(() => Date.now());

  async function load({ showLoading = true } = {}) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const result = await adminApi.getOrder(id, session.token);
      setOrder(result.data);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  async function runAction(request, successMessage, { reload = false } = {}) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await request();
      if (reload) await load({ showLoading: false });
      else setOrder((current) => ({ ...current, ...result.data }));
      setNotice(successMessage);
      setAction('');
      setReason('');
    } catch (requestError) {
      if (requestError.status === 401) logout();
      else {
        await load({ showLoading: false });
        setError(requestError.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const reservation = order ? reservationSummary(order, now) : null;
  const nextTransition = order?.status === 'confirmed'
    ? { status: 'preparing', button: 'Pasar a preparación', confirm: 'Confirmar inicio de preparación', message: 'El pedido pasó a preparación.' }
    : order?.status === 'preparing'
      ? { status: 'completed', button: 'Marcar como completado', confirm: 'Confirmar pedido completado', message: 'El pedido quedó marcado como completado.' }
      : null;

  if (loading) return <div className="orders-loading" aria-live="polite">Cargando detalle del pedido…</div>;
  if (!order) return <section className="admin-panel order-detail-missing"><p className="form-error" role="alert">{error || 'No se encontró el pedido.'}</p><Link className="button button--outline" to="/admin/pedidos">Volver a pedidos</Link></section>;

  return <div className="order-detail-page">
    <header className="admin-heading order-detail-heading">
      <div><Link className="back-link" to="/admin/pedidos">← Volver a pedidos</Link><p className="eyebrow">Detalle de venta</p><h1>{order.code}</h1><p>Creado el {formatOrderDate(order.created_at)}</p></div>
      <span className={`order-status order-status--${order.status}`}>Estado: {orderStatusLabel(order.status)}</span>
    </header>

    {error && <p className="form-error sticky-error" role="alert">{error}</p>}
    {notice && <p className="order-action-notice" role="status">{notice}</p>}

    <div className="order-detail-layout">
      <main className="order-detail-main">
        <section className="admin-panel" aria-labelledby="order-items-title">
          <div className="panel-title"><h2 id="order-items-title">Productos</h2><span>{order.items?.length || 0} líneas</span></div>
          <div className="order-items-detail">{order.items?.map((item) => <OrderItem key={item.id} item={item} />)}</div>
        </section>

        <section className="admin-panel" aria-labelledby="customer-title">
          <h2 id="customer-title">Cliente y entrega</h2>
          <dl className="order-data-grid">
            <DetailRow label="Nombre">{order.customer_name}</DetailRow>
            <DetailRow label="Teléfono"><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></DetailRow>
            <DetailRow label="Localidad">{order.customer_locality}</DetailRow>
            <DetailRow label="Dirección">{order.customer_address}</DetailRow>
          </dl>
          {order.customer_notes && <div className="order-note"><strong>Notas del cliente</strong><p>{order.customer_notes}</p></div>}
        </section>
      </main>

      <aside className="order-detail-aside">
        <section className="admin-panel order-summary" aria-labelledby="order-summary-title">
          <h2 id="order-summary-title">Resumen</h2>
          <dl>
            <DetailRow label="Subtotal"><Price value={order.subtotal} /></DetailRow>
            <DetailRow label="Envío">{order.shipping_cost == null ? 'A coordinar' : <Price value={order.shipping_cost} />}</DetailRow>
            <DetailRow label="Total"><Price value={order.total} /></DetailRow>
          </dl>
          <div className="order-timeline">
            <p><span>Pedido creado</span><strong>{formatOrderDate(order.created_at)}</strong></p>
            {order.reserved_until && <p><span>Fin de reserva</span><strong>{formatOrderDate(order.reserved_until)}</strong></p>}
            {order.confirmed_at && <p><span>Venta confirmada</span><strong>{formatOrderDate(order.confirmed_at)}</strong></p>}
            {order.completed_at && <p><span>Completado</span><strong>{formatOrderDate(order.completed_at)}</strong></p>}
            {order.cancelled_at && <p><span>Cancelado</span><strong>{formatOrderDate(order.cancelled_at)}</strong></p>}
          </div>
          {order.cancellation_reason && <div className="order-note"><strong>Motivo de cancelación</strong><p>{order.cancellation_reason}</p></div>}
        </section>

        <section className="admin-panel order-actions" aria-labelledby="order-actions-title">
          <h2 id="order-actions-title">Acciones</h2>
          {reservation && <span className={`reservation-state reservation-state--${reservation.tone}`}>{reservation.label}</span>}

          {order.status === 'reserved' && reservation?.tone !== 'expired' && !action && <div className="order-action-buttons">
            <button className="button button--primary" type="button" onClick={() => setAction('confirm')}>Confirmar venta</button>
            <button className="button button--outline" type="button" onClick={() => setAction('cancel')}>Cancelar reserva</button>
          </div>}
          {order.status === 'reserved' && reservation?.tone === 'expired' && !action && <div className="order-action-explanation"><p>La reserva ya venció. Registrá el vencimiento para liberar su disponibilidad.</p><button className="button button--primary" type="button" disabled={busy} onClick={() => runAction(() => adminApi.expireOrders(session.token), 'La reserva quedó registrada como vencida.', { reload: true })}>{busy ? 'Actualizando…' : 'Registrar vencimiento'}</button></div>}
          {nextTransition && !action && <div className="order-action-buttons"><button className="button button--primary" type="button" onClick={() => setAction('transition')}>{nextTransition.button}</button></div>}

          {action === 'confirm' && <div className="order-action-confirmation" role="region" aria-label="Confirmar venta">
            <h3>¿Confirmar la venta?</h3><p>Esta acción descontará el stock físico de todas las variantes del pedido y registrará los movimientos de inventario.</p>
            <div><button className="button button--primary" type="button" disabled={busy} onClick={() => runAction(() => adminApi.confirmOrder(id, session.token), 'La venta fue confirmada y el stock quedó actualizado.')}>{busy ? 'Confirmando…' : 'Confirmar y descontar stock'}</button><button className="button button--outline" type="button" disabled={busy} onClick={() => setAction('')}>Volver</button></div>
          </div>}
          {action === 'cancel' && <form className="order-action-confirmation" onSubmit={(event) => { event.preventDefault(); runAction(() => adminApi.cancelOrder(id, reason.trim() ? { reason: reason.trim() } : {}, session.token), 'La reserva fue cancelada y su disponibilidad quedó liberada.'); }}>
            <h3>¿Cancelar la reserva?</h3><p>Cancelar no suma stock físico porque la reserva nunca lo descontó.</p><label>Motivo opcional<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength="500" rows="3" /></label>
            <div><button className="button button--primary" disabled={busy}>{busy ? 'Cancelando…' : 'Confirmar cancelación'}</button><button className="button button--outline" type="button" disabled={busy} onClick={() => { setAction(''); setReason(''); }}>Volver</button></div>
          </form>}
          {action === 'transition' && nextTransition && <div className="order-action-confirmation" role="region" aria-label={nextTransition.confirm}>
            <h3>{nextTransition.confirm}</h3><p>El nuevo estado quedará visible para todo el equipo administrativo.</p>
            <div><button className="button button--primary" type="button" disabled={busy} onClick={() => runAction(() => adminApi.updateOrderStatus(id, nextTransition.status, session.token), nextTransition.message)}>{busy ? 'Actualizando…' : nextTransition.confirm}</button><button className="button button--outline" type="button" disabled={busy} onClick={() => setAction('')}>Volver</button></div>
          </div>}
          {['completed', 'cancelled', 'expired'].includes(order.status) && <p className="order-action-explanation">Este pedido está en un estado final y no tiene acciones pendientes.</p>}
        </section>
      </aside>
    </div>
  </div>;
}
