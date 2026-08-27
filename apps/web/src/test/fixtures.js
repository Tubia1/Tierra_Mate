export const category = { id: '1', name: 'Mates', slug: 'mates', active: true };

export const product = {
  id: '2', category_id: '1', category_name: 'Mates', name: 'Mate Imperial',
  min_price: '25000.00', physical_stock: 4, available_stock: 4, primary_image: 'products/2/main.webp',
  primary_image_url: 'https://images.example/main.webp', active: true, featured: true,
};

export const productDetail = {
  ...product,
  description: 'Un mate noble para compartir todos los días.',
  materials: 'Calabaza y cuero',
  images: [{ id: '9', public_url: 'https://images.example/main.webp', alt_text: 'Mate imperial' }],
  variants: [
    { id: '10', name: 'Negro', color: 'Negro', finish: 'Mate', price: '25000', stock_quantity: 4, available_stock: 4, active: true },
    { id: '11', name: 'Suela', color: 'Marrón', finish: 'Brillante', price: '28000', stock_quantity: 2, available_stock: 2, active: true },
  ],
  personalization_options: [
    { id: '20', name: 'Grabado', extra_price: '2500', active: true, required: false, allows_note: true },
  ],
};

export function jsonResponse(data, pagination = null, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => ok ? { data, pagination } : data });
}
