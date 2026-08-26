import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <section className="not-found container"><p className="eyebrow">Error 404</p><h1>Este camino no llega a la ronda.</h1><p>La página que buscás no existe o cambió de lugar.</p><Link className="button button--primary" to="/">Volver al inicio</Link></section>;
}
