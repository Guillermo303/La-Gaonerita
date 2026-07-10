import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const categories = query('SELECT * FROM categories ORDER BY sort_order');
  const items = query('SELECT * FROM menu_items WHERE available = 1 ORDER BY sort_order');
  const menu = categories.map(cat => ({ ...cat, items: items.filter(i => i.category_id === cat.id) }));
  res.json(menu);
});

router.get('/all', authenticate, authorize('admin'), (req, res) => {
  const categories = query('SELECT * FROM categories ORDER BY sort_order');
  const items = query('SELECT * FROM menu_items ORDER BY sort_order');
  const menu = categories.map(cat => ({ ...cat, items: items.filter(i => i.category_id === cat.id) }));
  res.json(menu);
});

router.post('/categories', authenticate, authorize('admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const result = run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description || null]);
  res.status(201).json({ id: result.lastInsertRowid, name, description });
});

router.put('/categories/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, description, sort_order } = req.body;
  run('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description), sort_order = COALESCE(?, sort_order) WHERE id = ?', [name, description, sort_order, req.params.id]);
  res.json({ success: true });
});

router.delete('/categories/:id', authenticate, authorize('admin'), (req, res) => {
  run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.post('/items', authenticate, authorize('admin'), (req, res) => {
  const { category_id, name, description, price, image } = req.body;
  if (!category_id || !name || !price) return res.status(400).json({ error: 'Categoría, nombre y precio requeridos' });
  const result = run('INSERT INTO menu_items (category_id, name, description, price, image) VALUES (?, ?, ?, ?, ?)', [category_id, name, description || null, price, image || null]);
  res.status(201).json({ id: result.lastInsertRowid, category_id, name, price });
});

router.put('/items/:id', authenticate, authorize('admin'), (req, res) => {
  const { category_id, name, description, price, image, available } = req.body;
  run('UPDATE menu_items SET category_id = COALESCE(?, category_id), name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), image = COALESCE(?, image), available = COALESCE(?, available) WHERE id = ?', [category_id, name, description, price, image, available, req.params.id]);
  res.json({ success: true });
});

router.delete('/items/:id', authenticate, authorize('admin'), (req, res) => {
  run('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
