export function LoadingSkeleton({ count = 4, variant = 'card' }) {
  return (
    <div className={`skeleton-grid skeleton-grid--${variant}`} aria-label="Cargando contenido" aria-busy="true">
      {Array.from({ length: count }, (_, index) => <div className="skeleton" key={index} />)}
    </div>
  );
}
