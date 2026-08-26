import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';

export function Layout() {
  return <><Header /><main><Outlet /></main><Footer /><ScrollRestoration /></>;
}
