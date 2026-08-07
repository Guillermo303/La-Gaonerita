import jwt from 'jsonwebtoken';

// Acepta 10 dígitos (asume México) o un número ya en formato +52XXXXXXXXXX.
export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  return null;
}

export function isPhoneVerified(token, phone) {
  const normalized = normalizePhone(phone);
  if (!token || !normalized) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.phone === normalized;
  } catch {
    return false;
  }
}
