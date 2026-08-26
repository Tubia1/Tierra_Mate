export function StockBadge({ stock }) {
  const available = Number(stock) > 0;
  return (
    <span className={`stock-badge ${available ? 'stock-badge--available' : 'stock-badge--empty'}`}>
      <span aria-hidden="true" className="stock-badge__dot" />
      {available ? 'Disponible' : 'Sin stock'}
    </span>
  );
}
