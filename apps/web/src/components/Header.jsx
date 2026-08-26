import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" to="/" onClick={close} aria-label="Tierra Mate Shop, inicio">
          <span className="brand__mark" aria-hidden="true">TM</span>
          <span><strong>Tierra Mate</strong><small>SHOP</small></span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="main-navigation"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((value) => !value)}
        >
          <span /><span /><span />
        </button>
        <nav id="main-navigation" className={`main-nav ${open ? 'main-nav--open' : ''}`} aria-label="Navegación principal">
          <NavLink to="/" onClick={close}>Inicio</NavLink>
          <NavLink to="/productos" onClick={close}>Productos</NavLink>
        </nav>
      </div>
    </header>
  );
}
