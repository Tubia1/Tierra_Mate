import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { MateScene } from '../components/MateScene.jsx';
import { useShopMotion } from '../hooks/useShopMotion.js';

export function HomePage({ categories, featured }) {
  const navigate = useNavigate();
  const scope = useRef(null);
  useShopMotion(scope, categories.data, featured.data);

  return (
    <div ref={scope} className="shop-home">
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <h1><span className="hero__line"><span>La tradición del mate,</span></span>{' '}<span className="hero__line"><em>elegida con intención.</em></span></h1>
            <p data-intro>Una colección cálida de mates, bombillas y accesorios para hacer de cada ronda un momento propio.</p>
            <div className="hero__actions" data-intro><Link className="button button--primary" to="/productos">Ver productos <span aria-hidden="true">→</span></Link><a className="hero__discover" href="#categories-title">Explorá la colección <span aria-hidden="true">↓</span></a></div>
            <p className="hero__footnote" data-intro>Elegí tus piezas. Armá tu pedido. Coordinamos por WhatsApp.</p>
          </div>
          <div className="hero__visual">
            <MateScene />
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="categories-title" data-reveal>
        <div className="section-heading"><div><h2 id="categories-title">Cada ritual tiene su pieza</h2></div><Link to="/productos">Ver todo <span aria-hidden="true">→</span></Link></div>
        {categories.loading && <LoadingSkeleton count={4} variant="category" />}
        {categories.error && <ErrorState error={categories.error} onRetry={categories.retry} />}
        {categories.data?.length === 0 && <EmptyState title="Pronto habrá categorías" />}
        {categories.data?.length > 0 && <div className="category-cards">{categories.data.map((category) => (
          <button key={category.id} type="button" aria-label={category.name} onClick={() => navigate(`/productos?categoria=${category.id}`)}>
            <strong>{category.name}</strong><span aria-hidden="true">↗</span>
          </button>
        ))}</div>}
      </section>

      <section className="section section--tinted" aria-labelledby="featured-title" data-reveal><div className="container">
        <div className="section-heading"><div><h2 id="featured-title">Productos destacados</h2><p>Favoritos de la casa para acompañar tu próxima ronda.</p></div><Link to="/productos">Explorar productos <span aria-hidden="true">→</span></Link></div>
        {featured.loading && <LoadingSkeleton count={4} />}
        {featured.error && <ErrorState error={featured.error} onRetry={featured.retry} />}
        {featured.data?.length === 0 && <EmptyState title="Aún no hay productos destacados" />}
        {featured.data?.length > 0 && <div className="product-grid">{featured.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      </div></section>

      <section className="benefits container" aria-label="Beneficios de Tierra Mate">
        <article><h3>Coordinación cercana</h3><p>Tu compra se coordinará de forma simple y personal por WhatsApp.</p></article>
        <article><h3>Elegí cada detalle</h3><p>Consultá la disponibilidad de cada color, terminación y modelo.</p></article>
        <article><h3>Hecho a tu manera</h3><p>Opciones personalizables para convertir cada pieza en algo único.</p></article>
      </section>
    </div>
  );
}
