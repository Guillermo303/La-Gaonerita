const API = `${import.meta.env.VITE_API_URL || ''}/api`;

const TIMEOUT_MS = 45000;

async function request(path, options = {}) {
  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch {
    throw new Error('Error de conexión: no se pudo contactar el servidor, intenta de nuevo');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Error ${res.status}: el servidor no respondió correctamente` }));
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
