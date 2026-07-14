import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, get, run } from '../db.js';

const router = Router();

router.post('/register', (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  const allowedRole = ['cliente', 'mesero'].includes(role) ? role : 'cliente';
  try {
    const existing = get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'El email ya está registrado' });
    const hash = bcrypt.hashSync(password, 10);
    const result = run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name, email, hash, phone || null, allowedRole]);
    const token = jwt.sign({ id: result.lastInsertRowid, name, email, role: allowedRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, name, email, role: allowedRole } });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
});

router.put('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No autenticado' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { name, phone, current_password, new_password } = req.body;
    if (new_password) {
      if (!current_password) return res.status(400).json({ error: 'Contraseña actual requerida para cambiar contraseña' });
      const user = get('SELECT * FROM users WHERE id = ?', [decoded.id]);
      if (!bcrypt.compareSync(current_password, user.password)) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      const hash = bcrypt.hashSync(new_password, 10);
      run('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), password = ? WHERE id = ?', [name, phone, hash, decoded.id]);
    } else {
      run('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?', [name, phone, decoded.id]);
    }
    const user = get('SELECT id, name, email, role, phone FROM users WHERE id = ?', [decoded.id]);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No autenticado' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user = get('SELECT id, name, email, role, phone FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
