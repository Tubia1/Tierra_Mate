export const ORDER_STATUSES = [
  { value: 'reserved', label: 'Reservado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'En preparación' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'expired', label: 'Vencido' },
];

export function orderStatusLabel(status) {
  return ORDER_STATUSES.find((item) => item.value === status)?.label || status;
}

export function formatOrderDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    ...options,
  }).format(date);
}

export function reservationSummary(order, now = Date.now()) {
  if (order.status !== 'reserved' || !order.reserved_until) return null;
  const remaining = new Date(order.reserved_until).getTime() - now;
  if (remaining <= 0) return { label: 'Reserva vencida', tone: 'expired' };
  const minutes = Math.ceil(remaining / 60000);
  if (minutes <= 10) return { label: `Vence en ${minutes} min`, tone: 'urgent' };
  return { label: `Vence ${formatOrderDate(order.reserved_until)}`, tone: 'active' };
}
