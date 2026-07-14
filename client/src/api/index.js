const API = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(err.error || 'Error desconocido');
  }
  return res.json();
}

export const auth = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) })
};

export const menu = {
  getAll: () => request('/menu'),
  getAllAdmin: () => request('/menu/all'),
  createCategory: (data) => request('/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/menu/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/menu/categories/${id}`, { method: 'DELETE' }),
  createItem: (data) => request('/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/menu/items/${id}`, { method: 'DELETE' })
};

export const orders = {
  getAll: () => request('/orders'),
  getAllActive: () => request('/orders/all'),
  getKitchen: () => request('/orders/kitchen/active'),
  getHistory: () => request('/orders/history'),
  getById: (id) => request(`/orders/${id}`),
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updatePayment: (id, payment_status) => request(`/orders/${id}/payment`, { method: 'PUT', body: JSON.stringify({ payment_status }) }),
  createPaymentIntent: (order_id) => request('/orders/create-payment-intent', { method: 'POST', body: JSON.stringify({ order_id }) }),
  addPayment: (id, data) => request(`/orders/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  getPayments: (id) => request(`/orders/${id}/payments`)
};

export const pos = {
  getInventory: () => request('/pos/inventory'),
  createInventoryItem: (data) => request('/pos/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventory: (id, data) => request(`/pos/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStock: (id, stock) => request(`/pos/inventory/${id}/stock`, { method: 'PUT', body: JSON.stringify({ stock }) }),
  deleteInventory: (id) => request(`/pos/inventory/${id}`, { method: 'DELETE' }),
  getSalesReport: (params) => request(`/pos/reports/sales?${new URLSearchParams(params || {}).toString()}`),
  getDailyReport: (days) => request(`/pos/reports/daily?days=${days || 7}`)
};

export const mesas = {
  getAll: () => request('/mesas'),
  create: (data) => request('/mesas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/mesas/${id}`, { method: 'DELETE' })
};

export const promotions = {
  getActive: () => request('/promotions/active'),
  getAll: () => request('/promotions'),
  create: (data) => request('/promotions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/promotions/${id}`, { method: 'DELETE' }),
  check: (total, items) => request(`/promotions/check?total=${total}${items ? `&items=${items.join(',')}` : ''}`)
};

export const settings = {
  get: () => request('/settings'),
  update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) })
};
