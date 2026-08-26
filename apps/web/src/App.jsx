import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { CatalogPage } from './pages/CatalogPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ProductDetailPage } from './pages/ProductDetailPage.jsx';
import { AuthProvider } from './admin/AuthContext.jsx';
import { ProtectedRoute } from './admin/ProtectedRoute.jsx';
import { AdminLayout } from './admin/AdminLayout.jsx';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.jsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage.jsx';
import { AdminProductsPage } from './pages/admin/AdminProductsPage.jsx';
import { AdminProductDetailPage } from './pages/admin/AdminProductDetailPage.jsx';

export const routes = [{ path: '/admin/login', element: <AdminLoginPage /> }, { element: <ProtectedRoute />, children: [{ path: '/admin', element: <AdminLayout />, children: [{ index: true, element: <AdminDashboardPage /> }, { path: 'productos', element: <AdminProductsPage /> }, { path: 'productos/:id', element: <AdminProductDetailPage /> }, { path: 'categorias', element: <AdminCategoriesPage /> }] }] }, { element: <Layout />, children: [{ path: '/', element: <HomePage /> }, { path: '/productos', element: <CatalogPage /> }, { path: '/productos/:id', element: <ProductDetailPage /> }, { path: '*', element: <NotFoundPage /> }] }];
export const router = createBrowserRouter(routes);

export function App() { return <AuthProvider><RouterProvider router={router} /></AuthProvider>; }
