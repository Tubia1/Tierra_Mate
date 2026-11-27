import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CategoryFilter } from '../components/CategoryFilter.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { catalogApi } from '../services/api.js';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('categoria') || '';
  const [categories, setCategories] = useState([]);
  useEffect(() => { catalogApi.getCategories({ active: true, limit: 100 }).then((result) => setCategories(result.data)).catch(() => setCategories([])); }, []);
  const setCategory = (value) => {
    const params = new URLSearchParams();
    if (value) params.set('categoria', value);
    setSearchParams(params);
  };

  return (
    <section className="catalog-page container">
      <header className="page-heading"><p className="eyebrow">Nuestra colección</p><h1>Productos para tu ritual</h1><p>Elegí entre piezas pensadas para acompañarte todos los días.</p></header>
      <CategoryFilter categories={categories} value={category} onChange={setCategory} />
      <CatalogResults key={category} category={category} />
    </section>
  );
}

function CatalogResults({ category }) {
  const pending = useRef(null);
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async ({ nextCursor, append = false } = {}) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { signal } = controller;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const result = await catalogApi.getProducts({ active: true, limit: 12, category_id: category || undefined, cursor: nextCursor }, { signal });
      if (signal.aborted) return;
      setProducts((current) => append ? [...current, ...result.data] : result.data);
      setCursor(result.pagination?.next_cursor ?? null);
    } catch (requestError) {
      if (!signal.aborted) setError(requestError);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [category]);

  useEffect(() => {
    loadProducts();
    return () => pending.current?.abort();
  }, [loadProducts]);

  return (
    <>
      {loading && <LoadingSkeleton count={8} />}
      {!loading && error && <ErrorState error={error} onRetry={() => loadProducts()} />}
      {!loading && !error && products.length === 0 && <EmptyState message="Probá seleccionando otra categoría." />}
      {!loading && !error && products.length > 0 && <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      {!loading && cursor && !error && <div className="load-more"><button className="button button--outline" type="button" disabled={loadingMore} onClick={() => loadProducts({ nextCursor: cursor, append: true })}>{loadingMore ? 'Cargando…' : 'Cargar más'}</button></div>}
    </>
  );
}
