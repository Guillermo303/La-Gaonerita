const STORAGE_KEY = 'gaonerita_phone_verification';

const normalize = (phone) => String(phone || '').replace(/\D/g, '');

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isVerified(phone) {
  const saved = readSaved();
  if (!saved?.token || !saved?.expiresAt) return false;
  if (normalize(saved.phone) !== normalize(phone)) return false;
  return Date.now() < saved.expiresAt;
}

export function getToken() {
  return readSaved()?.token || null;
}

export function saveVerification(phone, token) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    phone,
    token,
    expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
  }));
}
