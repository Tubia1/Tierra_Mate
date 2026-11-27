import { MateLoader } from '../components/MateLoader.jsx';
import { lazy, Suspense } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { catalogApi } from '../services/api.js';

const HomePage = lazy(() => import('./HomePage.jsx').then((module) => ({ default: module.HomePage })));

export function HomeRoute() {
  const categories = useAsync(async ({ signal }) => (await catalogApi.getCategories({ active: true, limit: 100 }, { signal })).data, []);
  const featured = useAsync(async ({ signal }) => (await catalogApi.getProducts({ active: true, featured: true, limit: 8 }, { signal })).data, []);

  return (
    <Suspense fallback={<MateLoader label="Cargando portada…" />}>
      <HomePage categories={categories} featured={featured} />
    </Suspense>
  );
}
