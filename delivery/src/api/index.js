const API = `${import.meta.env.VITE_API_URL || ''}/api`;

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(err.error || 'Error desconocido');
  }
  return res.json();
}

export const menu = {
  getAll: () => request('/menu')
};

export const orders = {
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMercadoPagoLink: (id) => request(`/orders/${id}/mercadopago-link`, { method: 'POST' }),
  getStatus: (id) => request(`/orders/${id}/status`)
};

export const customizations = {
  getAll: () => request('/customizations')
};
