import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const CATEGORIES = ['cocina', 'mobiliario', 'electronica', 'punto_de_venta', 'otro'];
const CONDITIONS = ['nuevo', 'bueno', 'regular', 'malo', 'fuera_de_servicio'];

router.get('/', authenticate, authorize('admin', 'socio'), (req, res) => {
  const { category } = req.query;
  const rows = category
    ? query('SELECT * FROM assets WHERE category = ? ORDER BY category, name', [category])
    : query('SELECT * FROM assets ORDER BY category, name');
  res.json(rows);
});

router.get('/summary', authenticate, authorize('admin', 'socio'), (req, res) => {
  const rows = query('SELECT * FROM assets');
  const totalValue = rows.reduce((s, a) => s + a.purchase_price * a.quantity, 0);
  const totalItems = rows.reduce((s, a) => s + a.quantity, 0);

  const byCategoryMap = new Map();
  for (const a of rows) {
    const cur = byCategoryMap.get(a.category) || { category: a.category, count: 0, value: 0 };
    cur.count += a.quantity;
    cur.value += a.purchase_price * a.quantity;
    byCategoryMap.set(a.category, cur);
  }
  const byCategory = [...byCategoryMap.values()].sort((a, b) => b.value - a.value);

  const byConditionMap = new Map();
  for (const a of rows) {
    const cur = byConditionMap.get(a.condition) || { condition: a.condition, count: 0 };
    cur.count += a.quantity;
    byConditionMap.set(a.condition, cur);
  }
  const byCondition = [...byConditionMap.values()];

  res.json({ totalValue, totalItems, assetCount: rows.length, byCategory, byCondition });
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { name, category, quantity, purchase_price, purchase_date, condition, location, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Categoría inválida' });
  if (condition && !CONDITIONS.includes(condition)) return res.status(400).json({ error: 'Estado inválido' });
  const qty = quantity !== undefined ? Number(quantity) : 1;
  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
  const price = purchase_price !== undefined ? Number(purchase_price) : 0;
  if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'El precio de compra no puede ser negativo' });
  if (purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(purchase_date)) return res.status(400).json({ error: 'Formato de fecha inválido' });

  const result = run(
    'INSERT INTO assets (name, category, quantity, purchase_price, purchase_date, condition, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, category || 'otro', qty, price, purchase_date || null, condition || 'bueno', location || null, notes || null]
  );
  const row = get('SELECT * FROM assets WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const existing = get('SELECT id FROM assets WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

  const { name, category, quantity, purchase_price, purchase_date, condition, location, notes } = req.body;
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Categoría inválida' });
  if (condition && !CONDITIONS.includes(condition)) return res.status(400).json({ error: 'Estado inválido' });
  if (quantity !== undefined && (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) return res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
  if (purchase_price !== undefined && (!Number.isFinite(Number(purchase_price)) || Number(purchase_price) < 0)) return res.status(400).json({ error: 'El precio de compra no puede ser negativo' });
  if (purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(purchase_date)) return res.status(400).json({ error: 'Formato de fecha inválido' });

  run(
    `UPDATE assets SET
       name = COALESCE(?, name),
       category = COALESCE(?, category),
       quantity = COALESCE(?, quantity),
       purchase_price = COALESCE(?, purchase_price),
       purchase_date = COALESCE(?, purchase_date),
       condition = COALESCE(?, condition),
       location = COALESCE(?, location),
       notes = COALESCE(?, notes),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, category, quantity !== undefined ? Number(quantity) : undefined, purchase_price !== undefined ? Number(purchase_price) : undefined,
      purchase_date, condition, location, notes, req.params.id]
  );
  const row = get('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const existing = get('SELECT id FROM assets WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });
  run('DELETE FROM assets WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export { CATEGORIES, CONDITIONS };
export default router;
