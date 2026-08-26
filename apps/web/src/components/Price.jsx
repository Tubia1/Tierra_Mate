import { formatPrice } from '../utils/formatPrice.js';

export function Price({ value, prefix = '' }) {
  if (value === null || value === undefined) return <span className="price price--unavailable">Consultar precio</span>;
  return <span className="price">{prefix}{formatPrice(value)}</span>;
}
