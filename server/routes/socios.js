import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

function parseSocio(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, active: row.active, created_at: row.created_at };
}

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const rows = await query("SELECT id, name, email, phone, active, created_at FROM users WHERE role = 'socio' ORDER BY active DESC, name ASC");
  res.json(rows.map(parseSocio));
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name, email, hash, phone || null, 'socio']);
  const row = await get('SELECT id, name, email, phone, active, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(parseSocio(row));
});

router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  const { active } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'Estado inválido' });
  const id = Number(req.params.id);
  const target = await get("SELECT id FROM users WHERE id = ? AND role = 'socio'", [id]);
  if (!target) return res.status(404).json({ error: 'Socio no encontrado' });

  if (active) {
    await run('UPDATE users SET active = 1 WHERE id = ?', [id]);
  } else {
    await run('UPDATE users SET active = 0, token_version = token_version + 1 WHERE id = ?', [id]);
  }

  const row = await get('SELECT id, name, email, phone, active, created_at FROM users WHERE id = ?', [id]);
  res.json(parseSocio(row));
});

export default router;
