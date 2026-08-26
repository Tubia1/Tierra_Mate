export function ProductImage({ src, alt = '', className = '' }) {
  if (src) return <img className={className} src={src} alt={alt} loading="lazy" />;
  return (
    <div className={`image-placeholder ${className}`} role="img" aria-label={`Imagen no disponible${alt ? `: ${alt}` : ''}`}>
      <span className="image-placeholder__sun" />
      <span className="image-placeholder__mate">◡</span>
      <span className="image-placeholder__label">Tierra Mate</span>
    </div>
  );
}
