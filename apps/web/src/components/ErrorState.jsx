export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <span aria-hidden="true">!</span>
      <h2>No pudimos cargar esta sección</h2>
      <p>{error?.message || 'Intentá nuevamente en unos instantes.'}</p>
      {onRetry && <button className="button button--primary" type="button" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}
