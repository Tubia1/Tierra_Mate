import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../cart/CartContext.jsx';
import { Price } from '../components/Price.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { orderApi } from '../services/api.js';

export function orderPayload(items, form) {
  const fields = new FormData(form);
  return {
    customer: {
      name: fields.get('name'),
      phone: fields.get('phone'),
      locality: fields.get('locality'),
      address: fields.get('address'),
      ...(fields.get('notes')?.trim() ? { notes: fields.get('notes') } : {}),
    },
    items: items.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
      personalizations: item.personalizations.map((option) => ({
        option_id: option.optionId,
        ...(option.selectedValue ? { selected_value: option.selectedValue } : {}),
        ...(option.customerNote ? { customer_note: option.customerNote } : {}),
      })),
    })),
  };
}

function maximumLineQuantity(items, line) {
  const usedByOtherLines = items.reduce((sum, item) => (
    String(item.variantId) === String(line.variantId) && item.cartLineId !== line.cartLineId
      ? sum + item.quantity
      : sum
  ), 0);
  return Math.max(1, Number(line.stock) - usedByOtherLines);
}

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(null);

  async function checkout(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const whatsappWindow = window.open('', '_blank');
    setSubmitting(true);
    setError('');
    try {
      const { data } = await orderApi.create(orderPayload(items, form));
      setCompleted(data);
      clearCart();
      if (data.whatsapp_url && whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappWindow.location.href = data.whatsapp_url;
      } else {
        whatsappWindow?.close();
      }
    } catch (checkoutError) {
      whatsappWindow?.close();
      setError(checkoutError.code === 'INSUFFICIENT_STOCK'
        ? 'Cambió la disponibilidad de uno de los productos. Revisá las cantidades e intentá nuevamente.'
        : checkoutError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) return <section className="cart-page container"><div className="order-success"><span aria-hidden="true">✓</span><p className="eyebrow">Reserva creada</p><h1>{completed.order.code}</h1><p>Tu pedido quedó reservado hasta las {new Date(completed.order.reserved_until).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.</p>{completed.whatsapp_url ? <a className="button button--primary" href={completed.whatsapp_url} target="_blank" rel="noreferrer">Continuar por WhatsApp</a> : <p className="form-error">La reserva fue creada, pero la tienda todavía no configuró su número de WhatsApp.</p>}<Link className="button button--outline" to="/productos">Volver al catálogo</Link></div></section>;

  if (items.length === 0) return <section className="cart-page container"><div className="cart-empty"><span aria-hidden="true">○</span><p className="eyebrow">Tu selección</p><h1>El carrito está vacío</h1><p>Explorá el catálogo y elegí el mate que te acompañará todos los días.</p><Link className="button button--primary" to="/productos">Ver productos</Link></div></section>;

  return (
    <section className="cart-page container">
      <header className="cart-heading"><div><p className="eyebrow">Tu selección</p><h1>Carrito</h1></div><Link to="/productos">← Seguir comprando</Link></header>
      <div className="cart-layout">
        <div className="cart-items" aria-label="Productos del carrito">
          {items.map((item) => <article className="cart-item" key={item.cartLineId}>
            <ProductImage src={item.imageUrl} alt={item.productName} />
            <div className="cart-item__info">
              <h2>{item.productName}</h2><p>{item.variantName}</p>
              {item.personalizations.length > 0 && <ul>{item.personalizations.map((option) => <li key={option.optionId}>{option.name}{option.label ? `: ${option.label}` : ''}{option.customerNote ? ` — ${option.customerNote}` : ''}</li>)}</ul>}
              <button type="button" onClick={() => removeItem(item.cartLineId)}>Eliminar</button>
            </div>
            <div className="cart-item__aside">
              <Price value={(Number(item.price) + item.personalizations.reduce((sum, option) => sum + Number(option.extraPrice || 0), 0)) * item.quantity} />
              <label>Cantidad<select value={item.quantity} onChange={(event) => updateQuantity(item.cartLineId, event.target.value)}>{Array.from({ length: maximumLineQuantity(items, item) }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label>
            </div>
          </article>)}
        </div>
        <aside className="checkout-card">
          <p className="eyebrow">Finalizar pedido</p><h2>Datos de entrega</h2>
          <p className="checkout-card__intro">Al continuar reservamos el stock durante 30 minutos y abrimos WhatsApp con el pedido preparado.</p>
          <form className="checkout-form" onSubmit={checkout}>
            <label>Nombre y apellido<input name="name" autoComplete="name" required maxLength="180" /></label>
            <label>Teléfono<input name="phone" type="tel" autoComplete="tel" required maxLength="80" /></label>
            <div className="form-row"><label>Localidad<input name="locality" autoComplete="address-level2" required maxLength="180" /></label><label>Dirección<input name="address" autoComplete="street-address" required maxLength="250" /></label></div>
            <label>Notas para el pedido <span>(opcional)</span><textarea name="notes" rows="3" maxLength="1000" /></label>
            <div className="checkout-total"><span>Total estimado</span><Price value={subtotal} /></div>
            <small>El total definitivo y la disponibilidad se validan al crear la reserva.</small>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button--primary" disabled={submitting}>{submitting ? 'Creando reserva…' : 'Reservar y abrir WhatsApp'}</button>
          </form>
        </aside>
      </div>
    </section>
  );
}
