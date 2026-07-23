const API = `${import.meta.env.VITE_API_URL || ''}/api`;

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
  me: () => request('/auth/me')
};

export const employees = {
  getAll: () => request('/employees'),
  hire: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setStatus: (id, active) => request(`/employees/${id}/status`, { method: 'PUT', body: JSON.stringify({ active }) })
};

export const menu = {
  getAll: () => request('/menu'),
  getAllAdmin: () => request('/menu/all'),
  createCategory: (data) => request('/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/menu/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/menu/categories/${id}`, { method: 'DELETE' }),
  createItem: (data) => request('/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStock: (id, stock) => request(`/menu/items/${id}/stock`, { method: 'PUT', body: JSON.stringify({ stock }) }),
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
  createPaymentIntent: (order_id) => request('/orders/create-payment-intent', { method: 'POST', body: JSON.stringify({ order_id }) })
};

export const mesas = {
  getAll: () => request('/mesas'),
  create: (data) => request('/mesas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/mesas/${id}`, { method: 'DELETE' })
};

export const reservations = {
  getAll: (date) => request(`/reservations${date ? `?date=${date}` : ''}`),
  setStatus: (id, status) => request(`/reservations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  delete: (id) => request(`/reservations/${id}`, { method: 'DELETE' })
};

export const socios = {
  getAll: () => request('/socios'),
  create: (data) => request('/socios', { method: 'POST', body: JSON.stringify(data) }),
  setStatus: (id, active) => request(`/socios/${id}/status`, { method: 'PUT', body: JSON.stringify({ active }) })
};

export const reports = {
  getSales: (period, date) => request(`/reports/sales?period=${period}${date ? `&date=${date}` : ''}`),
  getHealth: (period, date) => request(`/reports/health?period=${period}${date ? `&date=${date}` : ''}`),
  getFinance: (period, date) => request(`/reports/finance?period=${period}${date ? `&date=${date}` : ''}`),
  save: (period, date) => request('/reports/sales/save', { method: 'POST', body: JSON.stringify({ period, date }) }),
  getSaved: (period) => request(`/reports/saved${period ? `?period=${period}` : ''}`),
  getSavedById: (id) => request(`/reports/saved/${id}`),
  deleteSaved: (id) => request(`/reports/saved/${id}`, { method: 'DELETE' })
};

export const expenses = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/expenses${qs ? `?${qs}` : ''}`);
  },
  getSummary: (period, date) => request(`/expenses/summary?period=${period}${date ? `&date=${date}` : ''}`),
  create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' })
};

export const supplies = {
  getAll: () => request('/supplies'),
  create: (data) => request('/supplies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/supplies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setPurchased: (id, purchased) => request(`/supplies/${id}/purchase`, { method: 'PUT', body: JSON.stringify({ purchased }) }),
  delete: (id) => request(`/supplies/${id}`, { method: 'DELETE' }),
  getRecipes: (menuItemId) => request(`/supplies/recipes${menuItemId ? `?menu_item_id=${menuItemId}` : ''}`),
  createRecipe: (data) => request('/supplies/recipes', { method: 'POST', body: JSON.stringify(data) }),
  deleteRecipe: (id) => request(`/supplies/recipes/${id}`, { method: 'DELETE' }),
  getHistory: (supplyItemId) => request(`/supplies/history${supplyItemId ? `?supply_item_id=${supplyItemId}` : ''}`)
};

export const assets = {
  getAll: (category) => request(`/assets${category ? `?category=${category}` : ''}`),
  getSummary: () => request('/assets/summary'),
  create: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/assets/${id}`, { method: 'DELETE' })
};

export const users = {
  lookup: (email) => request(`/users/lookup?email=${encodeURIComponent(email)}`),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' })
};
