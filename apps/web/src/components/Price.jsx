import { formatPrice } from '../utils/formatPrice.js';
import { useStoreSettings } from '../store/StoreSettingsContext.jsx';

export function Price({ value, prefix = '', currency }) {
  const settings = useStoreSettings();
  if (value === null || value === undefined) return <span className="price price--unavailable">Consultar precio</span>;
  return <span className="price">{prefix}{formatPrice(value, currency ?? settings.currency)}</span>;
}
