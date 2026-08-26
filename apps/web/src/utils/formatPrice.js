const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(value) {
  const number = Number(value);
  return arsFormatter.format(Number.isFinite(number) ? number : 0);
}
