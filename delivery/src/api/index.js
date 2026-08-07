const API = `${import.meta.env.VITE_API_URL || ''}/api`;

const TIMEOUT_MS = 45000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

async function request(path, options = {}, attempt = 0) {
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
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return request(path, options, attempt + 1);
    }
    throw new Error('Error de conexión: no se pudo contactar el servidor, intenta de nuevo');
  }
  if (!res.ok) {
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return request(path, options, attempt + 1);
    }
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
  getStatus: (id) => request(`/orders/${id}/status`),
  getQueueCurrent: () => request('/orders/queue/current')
};

export const customizations = {
  getAll: () => request('/customizations')
};

export const verification = {
  send: (phone) => request('/verification/send', { method: 'POST', body: JSON.stringify({ phone }) }),
  check: (phone, code) => request('/verification/check', { method: 'POST', body: JSON.stringify({ phone, code }) })
};
