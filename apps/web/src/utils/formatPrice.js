export function formatPrice(value, currency = 'ARS') {
  const number = Number(value);
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'ARS';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: normalizedCurrency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0);
}
