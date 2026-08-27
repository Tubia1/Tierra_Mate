export function isProductAvailable(product) {
  return Number(product.available_stock ?? product.physical_stock ?? 0) > 0;
}

export function variantAvailableStock(variant) {
  return Math.max(0, Number(variant?.available_stock ?? variant?.stock_quantity ?? 0));
}

export function productImage(product) {
  return product.primary_image_url || product.images?.[0]?.public_url || null;
}
