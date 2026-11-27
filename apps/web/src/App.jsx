import { MateLoader } from './components/MateLoader.jsx';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
const CatalogPage = lazy(() => import('./pages/CatalogPage.jsx').then((module) => ({ default: module.CatalogPage })));
import { HomeRoute } from './pages/HomeRoute.jsx';
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx').then((module) => ({ default: module.NotFoundPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx').then((module) => ({ default: module.ProductDetailPage })));
const CartPage = lazy(() => import('./pages/CartPage.jsx').then((module) => ({ default: module.CartPage })));
import { AuthProvider } from './admin/AuthContext.jsx';
import { ProtectedRoute } from './admin/ProtectedRoute.jsx';
import { AdminLayout } from './admin/AdminLayout.jsx';
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage.jsx').then((module) => ({ default: module.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx').then((module) => ({ default: module.AdminDashboardPage })));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage.jsx').then((module) => ({ default: module.AdminCategoriesPage })));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage.jsx').then((module) => ({ default: module.AdminProductsPage })));
const AdminProductDetailPage = lazy(() => import('./pages/admin/AdminProductDetailPage.jsx').then((module) => ({ default: module.AdminProductDetailPage })));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage.jsx').then((module) => ({ default: module.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage.jsx').then((module) => ({ default: module.AdminOrderDetailPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx').then((module) => ({ default: module.AdminSettingsPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx').then((module) => ({ default: module.AdminUsersPage })));
const AdminInventoryPage = lazy(() => import('./pages/admin/AdminInventoryPage.jsx').then((module) => ({ default: module.AdminInventoryPage })));

export const routes = [{ path: '/admin/login', element: <AdminLoginPage /> }, { element: <ProtectedRoute />, children: [{ path: '/admin', element: <AdminLayout />, children: [{ index: true, element: <AdminDashboardPage /> }, { path: 'productos', element: <AdminProductsPage /> }, { path: 'productos/:id', element: <AdminProductDetailPage /> }, { path: 'categorias', element: <AdminCategoriesPage /> }, { path: 'pedidos', element: <AdminOrdersPage /> }, { path: 'pedidos/:id', element: <AdminOrderDetailPage /> }, { path: 'configuracion', element: <AdminSettingsPage /> }, { path: 'usuarios', element: <AdminUsersPage /> }, { path: 'inventario', element: <AdminInventoryPage /> }] }] }, { element: <Layout />, children: [{ path: '/', element: <HomeRoute /> }, { path: '/productos', element: <CatalogPage /> }, { path: '/productos/:id', element: <ProductDetailPage /> }, { path: '/carrito', element: <CartPage /> }, { path: '*', element: <NotFoundPage /> }] }];
export const router = createBrowserRouter(routes);

export function App() { return <AuthProvider><Suspense fallback={<MateLoader label="Cargando pantalla…" />}><RouterProvider router={router} /></Suspense></AuthProvider>; }
