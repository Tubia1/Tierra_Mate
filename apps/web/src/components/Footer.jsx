import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div><p className="site-footer__brand">Tierra Mate</p><p>Objetos para compartir la pausa, el encuentro y la tradición.</p></div>
        <nav aria-label="Navegación del pie"><Link to="/">Inicio</Link><Link to="/productos">Productos</Link></nav>
        <div>
          <a href="https://wa.me/" aria-label="WhatsApp de Tierra Mate, próximamente configurable">WhatsApp</a>
          <p>Precios expresados en ARS.</p>
          <p className="site-footer__creators">
            Creado por{' '}
            <a href="https://www.instagram.com/octavio_dugo/" target="_blank" rel="noreferrer">@octavio_dugo</a>
            {' y '}
            <a href="https://www.instagram.com/maximoferrara_/" target="_blank" rel="noreferrer">@maximoferrara_</a>
          </p>
        </div>
      </div>
      <div className="container site-footer__bottom"><span>Hecho con calma en Argentina.</span><span>© {new Date().getFullYear()} Tierra Mate Shop</span></div>
    </footer>
  );
}
