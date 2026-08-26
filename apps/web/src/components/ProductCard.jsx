import { Link } from 'react-router-dom';
import { productImage } from '../utils/product.js';
import { Price } from './Price.jsx';
import { ProductImage } from './ProductImage.jsx';
import { StockBadge } from './StockBadge.jsx';

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link className="product-card__image-link" to={`/productos/${product.id}`} aria-label={`Ver ${product.name}`}>
        <ProductImage className="product-card__image" src={productImage(product)} alt={product.name} />
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.category_name}</span>
          <StockBadge stock={product.physical_stock} />
        </div>
        <h3><Link to={`/productos/${product.id}`}>{product.name}</Link></h3>
        <div className="product-card__footer">
          <div><small>Desde</small><Price value={product.min_price} /></div>
          <Link className="button button--small button--outline" to={`/productos/${product.id}`}>Ver detalle</Link>
        </div>
      </div>
    </article>
  );
}
