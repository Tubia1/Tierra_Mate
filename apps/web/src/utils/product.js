export function isProductAvailable(product) {
  return Number(product.physical_stock ?? 0) > 0;
}

export function productImage(product) {
  return product.primary_image_url || product.images?.[0]?.public_url || null;
}
