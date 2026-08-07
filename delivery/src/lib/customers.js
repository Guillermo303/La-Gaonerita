const STORAGE_KEY = 'gaonerita_saved_customers';
const MAX_CUSTOMERS = 20;

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

export function getSavedCustomers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Coincidencia exacta por teléfono — nunca por nombre, para no sugerirle a
// alguien los datos de otra persona que se llame igual.
export function findCustomerByPhone(phone) {
  const key = normalizePhone(phone);
  if (!key) return null;
  const customers = getSavedCustomers()
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return customers.find(c => normalizePhone(c.phone) === key) || null;
}

export function saveCustomer({ name, phone, address }) {
  const key = normalizePhone(phone);
  if (!key) return;
  const customers = getSavedCustomers();
  const existing = customers.find(c => normalizePhone(c.phone) === key);
  const entry = {
    name: (name || '').trim(),
    phone: (phone || '').trim(),
    address: (address || '').trim(),
    updatedAt: new Date().toISOString()
  };
  if (existing) {
    Object.assign(existing, entry);
  } else {
    customers.push(entry);
  }
  const sorted = customers
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, MAX_CUSTOMERS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch {}
}
