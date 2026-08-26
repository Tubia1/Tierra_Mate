import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return <><header className="admin-heading"><div><p className="eyebrow">Administración</p><h1>Resumen</h1><p>Gestioná el contenido visible en la tienda.</p></div></header><section className="admin-cards"><Link to="/admin/productos"><span>01</span><h2>Productos</h2><p>Crear, editar, destacar o desactivar productos.</p></Link><Link to="/admin/categorias"><span>02</span><h2>Categorías</h2><p>Ordenar y organizar el catálogo público.</p></Link><div className="is-pending"><span>Próximo</span><h2>Pedidos</h2><p>Seguimiento administrativo en la siguiente etapa.</p></div></section></>;
}
