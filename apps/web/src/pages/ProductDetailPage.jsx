import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../cart/CartContext.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { LoadingSkeleton } from '../components/LoadingSkeleton.jsx';
import { Price } from '../components/Price.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { StockBadge } from '../components/StockBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { catalogApi } from '../services/api.js';
import { variantAvailableStock } from '../utils/product.js';
import { shopNotice } from '../utils/shopNotice.js';

function initialOptionState(options) {
  return Object.fromEntries(options.map((option) => [option.id, {
    enabled: Boolean(option.required),
    selectedValue: '',
    customerNote: '',
  }]));
}

export function ProductDetailPage() {
  const { id } = useParams();
  const { addItem, quantityForVariant } = useCart();
  const request = useAsync(async ({ signal }) => (await catalogApi.getProduct(id, { signal })).data, [id]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState('');
  const product = request.data;
  const variants = product?.variants?.filter((variant) => variant.active) ?? [];
  const personalizations = product?.personalization_options?.filter((option) => option.active) ?? [];

  useEffect(() => {
    setSelectedVariantId(variants[0]?.id ?? null);
    setSelectedOptions(initialOptionState(personalizations));
    setActiveImage(0);
    setQuantity(1);
    setFeedback('');
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedVariant = variants.find((variant) => String(variant.id) === String(selectedVariantId));
  const selectedAvailableStock = variantAvailableStock(selectedVariant);
  const selectedRemainingStock = Math.max(0, selectedAvailableStock - quantityForVariant(selectedVariantId));
  const selectedPersonalizations = useMemo(() => personalizations.flatMap((option) => {
    const state = selectedOptions[option.id] || {};
    const type = option.input_type || 'boolean';
    const hasText = Boolean(state.selectedValue?.trim() || state.customerNote?.trim());
    const selected = type === 'select'
      ? Boolean(state.selectedValue)
      : type === 'text' ? Boolean(state.enabled && hasText) : Boolean(option.required ? state.selectedValue : state.enabled);
    if (!selected) return [];
    const choice = option.choices?.find((entry) => entry.value === state.selectedValue);
    return [{
      optionId: option.id,
      name: option.name,
      selectedValue: type === 'boolean' ? (state.selectedValue || 'true') : state.selectedValue,
      label: choice?.label || (type === 'boolean' ? (state.selectedValue === 'false' ? 'No' : 'Sí') : state.selectedValue),
      customerNote: state.customerNote,
      extraPrice: option.extra_price,
    }];
  }), [personalizations, selectedOptions]);
  const unitTotal = useMemo(() => Number(selectedVariant?.price ?? 0) + selectedPersonalizations.reduce(
    (sum, option) => sum + Number(option.extraPrice ?? 0), 0,
  ), [selectedVariant, selectedPersonalizations]);

  function updateOption(optionId, changes) {
    setSelectedOptions((current) => ({ ...current, [optionId]: { ...current[optionId], ...changes } }));
    setFeedback('');
  }

  function selectVariant(variantId) {
    setSelectedVariantId(variantId);
    setQuantity(1);
    setFeedback('');
  }

  function addToCart() {
    if (!selectedVariant || selectedAvailableStock < 1) return;
    const missingRequired = personalizations.find((option) => {
      if (!option.required) return false;
      const state = selectedOptions[option.id] || {};
      return option.input_type === 'select' || option.input_type === 'text'
        ? !state.selectedValue?.trim()
        : !state.selectedValue;
    });
    if (missingRequired) {
      setFeedback(`Completá la opción obligatoria: ${missingRequired.name}.`);
      return;
    }
    const result = addItem({
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      stock: selectedAvailableStock,
      quantity,
      imageUrl: product.images?.[0]?.public_url || null,
      personalizations: selectedPersonalizations,
    });
    if (result.addedQuantity < quantity) {
      setFeedback(result.addedQuantity > 0
        ? `Se agregaron ${result.addedQuantity} unidades. Alcanzaste el stock disponible de esta variante.`
        : 'No queda disponibilidad para agregar más unidades de esta variante.');
      return;
    }
    setFeedback(`${product.name} se agregó al carrito.`);
    void shopNotice('Agregado al carrito', `${product.name} · ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`);
  }

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
          <div className="product-info__price" data-testid="total-price" aria-live="polite"><Price value={unitTotal * quantity} /></div>
          <StockBadge stock={selectedAvailableStock} />
          {product.description && <p className="product-info__description">{product.description}</p>}
          {product.materials && <p className="materials"><strong>Materiales</strong><span>{product.materials}</span></p>}

          <fieldset className="selection-group"><legend>Elegí una variante</legend><div className="option-grid">
            {variants.map((variant) => <label className={String(selectedVariantId) === String(variant.id) ? 'option-card is-selected' : 'option-card'} key={variant.id}>
              <input type="radio" name="variant" value={variant.id} checked={String(selectedVariantId) === String(variant.id)} onChange={() => selectVariant(variant.id)} />
              <span><strong>{variant.name}</strong><small>{[variant.color, variant.finish].filter(Boolean).join(' · ') || 'Modelo estándar'}</small></span>
              <span><Price value={variant.price} /><small>{variantAvailableStock(variant)} disponibles</small></span>
            </label>)}
          </div>{variants.length === 0 && <p>No hay variantes activas disponibles.</p>}</fieldset>

          {personalizations.length > 0 && <fieldset className="selection-group"><legend>Personalizalo</legend><div className="personalization-list">
            {personalizations.map((option) => <PersonalizationControl key={option.id} option={option} state={selectedOptions[option.id] || {}} update={(changes) => updateOption(option.id, changes)} />)}
          </div></fieldset>}

          <div className="add-to-cart">
            <label>Cantidad<select value={Math.min(quantity, Math.max(1, selectedRemainingStock))} disabled={selectedRemainingStock < 1} onChange={(event) => setQuantity(Number(event.target.value))}>{Array.from({ length: selectedRemainingStock }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label>
            <button className="button button--primary" type="button" disabled={!selectedVariant || selectedRemainingStock < 1} onClick={addToCart}>{selectedRemainingStock > 0 ? 'Agregar al carrito' : 'Sin disponibilidad'}</button>
          </div>
          {feedback && <p className="cart-feedback" aria-live="polite">{feedback}</p>}
        </div>
      </div>
    </section>
  );
}

function PersonalizationControl({ option, state, update }) {
  const type = option.input_type || 'boolean';
  const active = Boolean(option.required || state.enabled || (type === 'select' && state.selectedValue));
  return <div className={`personalization-option ${active ? 'is-selected' : ''}`}>
    {type === 'select' && <label className="personalization-select"><span><strong>{option.name}{option.required ? ' *' : ''}</strong><small>Elegí una opción</small></span><select aria-label={option.name} value={state.selectedValue || ''} required={option.required} onChange={(event) => update({ selectedValue: event.target.value, enabled: Boolean(event.target.value) })}><option value="">{option.required ? 'Seleccionar' : 'Sin personalización'}</option>{(option.choices || []).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><Price value={option.extra_price} prefix="+ " /></label>}
    {type === 'text' && <><label className="check-option"><input type="checkbox" checked={active} disabled={option.required} onChange={(event) => update({ enabled: event.target.checked, selectedValue: event.target.checked ? state.selectedValue : '', customerNote: event.target.checked ? state.customerNote : '' })} /><span><strong>{option.name}{option.required ? ' *' : ''}</strong><small>Ingresá el texto que querés personalizar.</small></span><Price value={option.extra_price} prefix="+ " /></label>{active && <input className="personalization-input" aria-label={`Valor para ${option.name}`} value={state.selectedValue || ''} maxLength="500" required={option.required} onChange={(event) => update({ selectedValue: event.target.value })} />}</>}
    {type === 'boolean' && (option.required ? <label className="personalization-select"><span><strong>{option.name} *</strong><small>Elegí sí o no.</small></span><select aria-label={option.name} value={state.selectedValue || ''} required onChange={(event) => update({ selectedValue: event.target.value, enabled: Boolean(event.target.value) })}><option value="">Seleccionar</option><option value="true">Sí</option><option value="false">No</option></select><Price value={option.extra_price} prefix="+ " /></label> : <label className="check-option"><input type="checkbox" checked={Boolean(state.enabled)} onChange={(event) => update({ enabled: event.target.checked, selectedValue: event.target.checked ? 'true' : '' })} /><span><strong>{option.name}</strong><small>{option.allows_note ? 'Podés agregar una indicación.' : 'Agregar al producto.'}</small></span><Price value={option.extra_price} prefix="+ " /></label>)}
    {option.allows_note && active && <textarea aria-label={`Nota para ${option.name}`} placeholder="Indicaciones (opcional)" value={state.customerNote || ''} maxLength="500" onChange={(event) => update({ customerNote: event.target.value })} />}
  </div>;
}
