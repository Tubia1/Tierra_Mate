import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { catalogApi } from '../services/api.js';
import tierraMateHome from '../assets/tierra-mate-home-transparent.png';

export function HomePage() {
  const navigate = useNavigate();
  const categories = useAsync(async () => (await catalogApi.getCategories({ active: true, limit: 100 })).data, []);
  const featured = useAsync(async () => (await catalogApi.getProducts({ active: true, featured: true, limit: 8 })).data, []);

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">Rituales que nos encuentran</p>
            <h1>La tradición del mate, elegida con intención.</h1>
            <p>Una colección cálida de mates, bombillas y accesorios para hacer de cada ronda un momento propio.</p>
            <Link className="button button--primary" to="/productos">Ver productos <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero__visual">
            <div className="hero__halo" />
            <img src={tierraMateHome} alt="Logotipo ilustrado de Tierra Mate" className="hero__image hero__image--brand" fetchPriority="high" />
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="categories-title">
        <div className="section-heading"><div><p className="eyebrow">Explorá a tu manera</p><h2 id="categories-title">Cada ritual tiene su pieza</h2></div><Link to="/productos">Ver todo <span aria-hidden="true">→</span></Link></div>
        {categories.loading && <LoadingSkeleton count={4} variant="category" />}
        {categories.error && <ErrorState error={categories.error} onRetry={categories.retry} />}
        {categories.data?.length === 0 && <EmptyState title="Pronto habrá categorías" />}
        {categories.data?.length > 0 && <div className="category-cards">{categories.data.map((category, index) => (
          <button key={category.id} type="button" aria-label={category.name} onClick={() => navigate(`/productos?categoria=${category.id}`)}>
            <span className="category-cards__number">0{index + 1}</span><strong>{category.name}</strong><span aria-hidden="true">↗</span>
          </button>
        ))}</div>}
      </section>

      <section className="section section--tinted" aria-labelledby="featured-title"><div className="container">
        <div className="section-heading"><div><p className="eyebrow">Favoritos de la casa</p><h2 id="featured-title">Productos destacados</h2></div></div>
        {featured.loading && <LoadingSkeleton count={4} />}
        {featured.error && <ErrorState error={featured.error} onRetry={featured.retry} />}
        {featured.data?.length === 0 && <EmptyState title="Aún no hay productos destacados" />}
        {featured.data?.length > 0 && <div className="product-grid">{featured.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      </div></section>

      <section className="benefits container" aria-label="Beneficios de Tierra Mate">
        <article><span aria-hidden="true">01</span><h3>Coordinación cercana</h3><p>Tu compra se coordinará de forma simple y personal por WhatsApp.</p></article>
        <article><span aria-hidden="true">02</span><h3>Stock por variante</h3><p>Disponibilidad real para cada color, terminación y modelo.</p></article>
        <article><span aria-hidden="true">03</span><h3>Hecho a tu manera</h3><p>Opciones personalizables para convertir cada pieza en algo único.</p></article>
      </section>
    </>
  );
}
