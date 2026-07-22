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

export const reports = {
  getSales: (period, date) => request(`/reports/sales?period=${period}${date ? `&date=${date}` : ''}`),
  getHealth: (period, date) => request(`/reports/health?period=${period}${date ? `&date=${date}` : ''}`),
  getSaved: (period) => request(`/reports/saved${period ? `?period=${period}` : ''}`),
  getSavedById: (id) => request(`/reports/saved/${id}`)
};
