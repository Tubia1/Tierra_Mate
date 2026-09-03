const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

function jsonOptions(method, body, token) {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function formOptions(method, body, token) {
  return { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body };
}

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new ApiError('No pudimos conectar con la tienda. Revisá tu conexión e intentá nuevamente.', 'NETWORK_ERROR', 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || 'Ocurrió un error al consultar la tienda.',
      payload.error?.code,
      response.status,
    );
  }
  return { data: payload.data, pagination: payload.pagination ?? null };
}

export const catalogApi = {
  getCategories: (params = {}) => apiRequest(`/categories${toQuery(params)}`),
  getProducts: (params = {}) => apiRequest(`/products${toQuery(params)}`),
  getProduct: (id) => apiRequest(`/products/${encodeURIComponent(id)}`),
};

export const orderApi = {
  create: (data) => apiRequest('/orders', jsonOptions('POST', data)),
};

export const storeSettingsApi = { get: () => apiRequest('/store-settings') };

export const adminApi = {
  login: (credentials) => apiRequest('/auth/login', jsonOptions('POST', credentials)),
  getDashboard: (token) => apiRequest('/dashboard', jsonOptions('GET', undefined, token)),
  getOrders: (params = {}, token) => apiRequest(`/orders${toQuery(params)}`, jsonOptions('GET', undefined, token)),
  getOrder: (id, token) => apiRequest(`/orders/${encodeURIComponent(id)}`, jsonOptions('GET', undefined, token)),
  confirmOrder: (id, token) => apiRequest(`/orders/${encodeURIComponent(id)}/confirm`, jsonOptions('PATCH', undefined, token)),
  cancelOrder: (id, data, token) => apiRequest(`/orders/${encodeURIComponent(id)}/cancel`, jsonOptions('PATCH', data, token)),
  updateOrderStatus: (id, status, token) => apiRequest(`/orders/${encodeURIComponent(id)}/status`, jsonOptions('PATCH', { status }, token)),
  expireOrders: (token) => apiRequest('/orders/expire', jsonOptions('POST', undefined, token)),
  getStoreSettings: () => apiRequest('/store-settings'),
  updateStoreSettings: (data, token) => apiRequest('/store-settings', jsonOptions('PATCH', data, token)),
  getAdminUsers: (token) => apiRequest('/admin-users', jsonOptions('GET', undefined, token)),
  createAdminUser: (data, token) => apiRequest('/admin-users', jsonOptions('POST', data, token)),
  updateAdminUserStatus: (id, active, token) => apiRequest(`/admin-users/${encodeURIComponent(id)}/status`, jsonOptions('PATCH', { active }, token)),
  resetAdminUserPassword: (id, password, token) => apiRequest(`/admin-users/${encodeURIComponent(id)}/password`, jsonOptions('PATCH', { password }, token)),
  getInventoryMovements: (params = {}, token) => apiRequest(`/inventory/movements${toQuery(params)}`, jsonOptions('GET', undefined, token)),
  getLowStock: (token) => apiRequest('/inventory/low-stock', jsonOptions('GET', undefined, token)),
  getCategories: (params = {}) => apiRequest(`/categories${toQuery(params)}`),
  createCategory: (data, token) => apiRequest('/categories', jsonOptions('POST', data, token)),
  updateCategory: (id, data, token) => apiRequest(`/categories/${id}`, jsonOptions('PATCH', data, token)),
  deactivateCategory: (id, token) => apiRequest(`/categories/${id}`, jsonOptions('DELETE', undefined, token)),
  getProducts: (params = {}) => apiRequest(`/products${toQuery(params)}`),
  getProduct: (id) => apiRequest(`/products/${id}`),
  createProduct: (data, token) => apiRequest('/products', jsonOptions('POST', data, token)),
  updateProduct: (id, data, token) => apiRequest(`/products/${id}`, jsonOptions('PATCH', data, token)),
  deactivateProduct: (id, token) => apiRequest(`/products/${id}`, jsonOptions('DELETE', undefined, token)),
  createVariant: (productId, data, token) => apiRequest(`/products/${productId}/variants`, jsonOptions('POST', data, token)),
  updateVariant: (productId, id, data, token) => apiRequest(`/products/${productId}/variants/${id}`, jsonOptions('PATCH', data, token)),
  deactivateVariant: (productId, id, token) => apiRequest(`/products/${productId}/variants/${id}`, jsonOptions('DELETE', undefined, token)),
  adjustStock: (productId, id, data, token) => apiRequest(`/products/${productId}/variants/${id}/stock`, jsonOptions('PATCH', data, token)),
  uploadImage: (productId, data, token) => apiRequest(`/products/${productId}/images/upload`, formOptions('POST', data, token)),
  updateImage: (productId, id, data, token) => apiRequest(`/products/${productId}/images/${id}`, jsonOptions('PATCH', data, token)),
  deleteImage: (productId, id, token) => apiRequest(`/products/${productId}/images/${id}`, jsonOptions('DELETE', undefined, token)),
  createPersonalization: (productId, data, token) => apiRequest(`/products/${productId}/personalizations`, jsonOptions('POST', data, token)),
  updatePersonalization: (productId, id, data, token) => apiRequest(`/products/${productId}/personalizations/${id}`, jsonOptions('PATCH', data, token)),
  deactivatePersonalization: (productId, id, token) => apiRequest(`/products/${productId}/personalizations/${id}`, jsonOptions('DELETE', undefined, token)),
};
