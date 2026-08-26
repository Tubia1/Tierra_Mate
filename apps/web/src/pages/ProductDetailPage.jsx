import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '../components/ErrorState.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { Price } from '../components/Price.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { StockBadge } from '../components/StockBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { catalogApi } from '../services/api.js';

export function ProductDetailPage() {
  const { id } = useParams();
  const request = useAsync(async () => (await catalogApi.getProduct(id)).data, [id]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [activeImage, setActiveImage] = useState(0);
  const product = request.data;
  const variants = product?.variants?.filter((variant) => variant.active) ?? [];
  const personalizations = product?.personalization_options?.filter((option) => option.active) ?? [];

  useEffect(() => {
    setSelectedVariantId(variants[0]?.id ?? null);
    setSelectedOptions({});
    setActiveImage(0);
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedVariant = variants.find((variant) => String(variant.id) === String(selectedVariantId));
  const total = useMemo(() => Number(selectedVariant?.price ?? 0) + personalizations.reduce(
    (sum, option) => sum + (selectedOptions[option.id] ? Number(option.extra_price ?? 0) : 0), 0,
  ), [selectedVariant, selectedOptions, personalizations]);

  if (request.loading) return <section className="detail-page container"><LoadingSkeleton count={2} variant="detail" /></section>;
  if (request.error) return <section className="detail-page container"><ErrorState error={request.error} onRetry={request.retry} /></section>;

  const images = product.images ?? [];
  const activeImageData = images[activeImage];
  return (
    <section className="detail-page container">
      <nav className="breadcrumbs" aria-label="Migas de pan"><Link to="/productos">Productos</Link><span>/</span><span>{product.name}</span></nav>
      <div className="detail-layout">
        <div className="gallery">
          <ProductImage className="gallery__main" src={activeImageData?.public_url} alt={activeImageData?.alt_text || product.name} />
          {images.length > 1 && <div className="gallery__thumbs" aria-label="Galería del producto">{images.map((image, index) => (
            <button type="button" className={activeImage === index ? 'is-active' : ''} key={image.id} onClick={() => setActiveImage(index)} aria-label={`Ver imagen ${index + 1}`}>
              <ProductImage src={image.public_url} alt="" />
            </button>
          ))}</div>}
        </div>
        <div className="product-info">
          <p className="eyebrow">{product.category_name}</p>
          <h1>{product.name}</h1>
          <div className="product-info__price" data-testid="total-price" aria-live="polite"><Price value={total} /></div>
          <StockBadge stock={selectedVariant?.stock_quantity ?? 0} />
          {product.description && <p className="product-info__description">{product.description}</p>}
          {product.materials && <p className="materials"><strong>Materiales</strong><span>{product.materials}</span></p>}

          <fieldset className="selection-group"><legend>Elegí una variante</legend><div className="option-grid">
            {variants.map((variant) => <label className={String(selectedVariantId) === String(variant.id) ? 'option-card is-selected' : 'option-card'} key={variant.id}>
              <input type="radio" name="variant" value={variant.id} checked={String(selectedVariantId) === String(variant.id)} onChange={() => setSelectedVariantId(variant.id)} />
              <span><strong>{variant.name}</strong><small>{[variant.color, variant.finish].filter(Boolean).join(' · ') || 'Modelo estándar'}</small></span>
              <span><Price value={variant.price} /><small>{variant.stock_quantity} disponibles</small></span>
            </label>)}
          </div>{variants.length === 0 && <p>No hay variantes activas disponibles.</p>}</fieldset>

          {personalizations.length > 0 && <fieldset className="selection-group"><legend>Personalizalo</legend><div className="personalization-list">
            {personalizations.map((option) => <label className="check-option" key={option.id}>
              <input type="checkbox" checked={Boolean(selectedOptions[option.id])} onChange={(event) => setSelectedOptions((current) => ({ ...current, [option.id]: event.target.checked }))} />
              <span><strong>{option.name}{option.required ? ' *' : ''}</strong><small>{option.allows_note ? 'Podrás agregar un comentario.' : 'Sin comentarios adicionales.'}</small></span>
              <Price value={option.extra_price} prefix="+ " />
            </label>)}
          </div></fieldset>}

          <div className="next-stage-note"><span aria-hidden="true">i</span><p>El carrito y la compra por WhatsApp se incorporarán en la siguiente etapa.</p></div>
        </div>
      </div>
    </section>
  );
}
