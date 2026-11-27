import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';

export function Layout() {
  return <div className="storefront"><a className="skip-link" href="#shop-content">Saltar al contenido</a><Header /><main id="shop-content" tabIndex={-1}><Outlet /></main><Footer /><ScrollRestoration /></div>;
}
