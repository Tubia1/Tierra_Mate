import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export function AdminLayout() {
  const { session, logout } = useAuth();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="brand admin-brand" to="/admin"><span className="brand__mark">TM</span><span><strong>Tierra Mate</strong><small>ADMIN</small></span></NavLink>
        <nav aria-label="Panel administrativo">
          <NavLink end to="/admin">Resumen</NavLink>
          <NavLink to="/admin/productos">Productos</NavLink>
          <NavLink to="/admin/categorias">Categorías</NavLink>
          <a href="/" target="_blank" rel="noreferrer">Ver tienda ↗</a>
        </nav>
        <div className="admin-user"><small>Sesión iniciada</small><strong>{session.admin.name}</strong><button type="button" onClick={logout}>Cerrar sesión</button></div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}
