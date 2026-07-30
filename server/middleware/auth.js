import jwt from 'jsonwebtoken';
import { get } from '../db.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await get('SELECT id, name, email, role, active, token_version FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'Token inválido' });
    if (!user.active) return res.status(401).json({ error: 'Esta cuenta ha sido desactivada' });
    if (user.token_version !== decoded.tv) return res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// A diferencia de `authenticate`, nunca rechaza la petición: si no hay token
// válido simplemente deja `req.user = null` (pedidos de invitados desde la
// app de domicilio, sin cuenta).
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await get('SELECT id, name, email, role, active, token_version FROM users WHERE id = ?', [decoded.id]);
    if (!user || !user.active || user.token_version !== decoded.tv) {
      req.user = null;
      return next();
    }
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    next();
  };
}
