const STORAGE_KEY = 'gaonerita_saved_customers';
const MAX_CUSTOMERS = 20;

const normalize = (name) => (name || '').toLowerCase().trim().replace(/\s+/g, ' ');

export function getSavedCustomers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function findCustomerByName(name) {
  const key = normalize(name);
  if (!key) return null;
  const customers = getSavedCustomers()
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return customers.find(c => normalize(c.name) === key) || null;
}

export function saveCustomer({ name, phone, address }) {
  const cleanName = (name || '').trim();
  if (!cleanName) return;
  const key = normalize(cleanName);
  const customers = getSavedCustomers();
  const existing = customers.find(c => normalize(c.name) === key);
  const entry = {
    name: cleanName,
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
