process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
process.env.SUPABASE_STORAGE_BUCKET = 'product-images';

const { setAdminIdentityResolver } = await import('../src/middlewares/authMiddleware.js');
setAdminIdentityResolver(async (id) => ({ id, email: 'admin@example.com', active: true }));
