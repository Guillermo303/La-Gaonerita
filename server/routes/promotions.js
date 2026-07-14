import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/active', (req, res) => {
  const now = new Date().toISOString();
  const promos = query("SELECT * FROM promotions WHERE active = 1 AND start_date <= ? AND end_date >= ? ORDER BY created_at DESC", [now, now]);
  res.json(promos);
});

router.get('/', authenticate, authorize('admin'), (req, res) => {
  const promos = query("SELECT * FROM promotions ORDER BY created_at DESC");
  res.json(promos);
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { name, description, discount_type, discount_value, min_purchase, applicable_items, start_date, end_date } = req.body;
  if (!name || !discount_type || !discount_value || !start_date || !end_date) {
    return res.status(400).json({ error: 'Nombre, tipo, valor, inicio y fin requeridos' });
  }
  const result = run('INSERT INTO promotions (name, description, discount_type, discount_value, min_purchase, applicable_items, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || null, discount_type, discount_value, min_purchase || 0, applicable_items ? JSON.stringify(applicable_items) : null, start_date, end_date]);
  const promo = get('SELECT * FROM promotions WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(promo);
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, description, discount_type, discount_value, min_purchase, applicable_items, start_date, end_date, active } = req.body;
  const promo = get('SELECT * FROM promotions WHERE id = ?', [req.params.id]);
  if (!promo) return res.status(404).json({ error: 'Promoción no encontrada' });
  run('UPDATE promotions SET name = ?, description = ?, discount_type = ?, discount_value = ?, min_purchase = ?, applicable_items = ?, start_date = ?, end_date = ?, active = ? WHERE id = ?',
    [name ?? promo.name, description !== undefined ? description : promo.description, discount_type ?? promo.discount_type,
     discount_value ?? promo.discount_value, min_purchase ?? promo.min_purchase,
     applicable_items ? JSON.stringify(applicable_items) : promo.applicable_items,
     start_date ?? promo.start_date, end_date ?? promo.end_date, active !== undefined ? (active ? 1 : 0) : promo.active, req.params.id]);
  res.json(get('SELECT * FROM promotions WHERE id = ?', [req.params.id]));
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  run('DELETE FROM promotions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/check', (req, res) => {
  const { total, items } = req.query;
  const now = new Date().toISOString();
  const promos = query("SELECT * FROM promotions WHERE active = 1 AND start_date <= ? AND end_date >= ? ORDER BY created_at DESC", [now, now]);
  const applicable = [];
  for (const promo of promos) {
    if (promo.min_purchase > 0 && parseFloat(total) < promo.min_purchase) continue;
    let promoTotal = parseFloat(total);
    if (promo.applicable_items) {
      const itemIds = JSON.parse(promo.applicable_items);
      if (items) {
        const orderItems = items.split(',').map(Number);
        const matched = orderItems.filter(id => itemIds.includes(id));
        if (matched.length === 0) continue;
        promoTotal = 0;
      }
    }
    const discount = promo.discount_type === 'percentage'
      ? promoTotal * (promo.discount_value / 100)
      : Math.min(promo.discount_value, promoTotal);
    applicable.push({ ...promo, calculated_discount: Math.round(discount * 100) / 100 });
  }
  res.json(applicable);
});

export default router;
