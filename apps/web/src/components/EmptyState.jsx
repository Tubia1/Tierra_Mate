export function EmptyState({ title = 'Todavía no hay productos', message = 'Estamos preparando novedades para vos.' }) {
  return <div className="state-card"><span aria-hidden="true">✦</span><h2>{title}</h2><p>{message}</p></div>;
}
