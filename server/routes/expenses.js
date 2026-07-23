import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { computeRange } from '../salesReports.js';

const router = Router();

const CATEGORIES = ['renta', 'servicios', 'insumos', 'mantenimiento', 'marketing', 'impuestos', 'otro'];
const PAYMENT_METHODS = ['efectivo', 'transferencia', 'tarjeta'];

router.get('/', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { from, to, category } = req.query;
  const clauses = [];
  const params = [];
  if (from) { clauses.push('date >= ?'); params.push(from); }
  if (to) { clauses.push('date <= ?'); params.push(to); }
  if (category) { clauses.push('category = ?'); params.push(category); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(`SELECT * FROM expenses ${where} ORDER BY date DESC, created_at DESC`, params);
  res.json(rows);
});

router.get('/summary', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { period = 'day', date } = req.query;
  if (!['day', 'week', 'month'].includes(period)) return res.status(400).json({ error: 'Periodo inválido' });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Formato de fecha inválido' });

  const anchor = date ? new Date(`${date}T12:00:00`) : new Date();
  const [start, end] = computeRange(period, anchor);
  const startStr = start.toLocaleDateString('en-CA');
  const endStr = end.toLocaleDateString('en-CA');

  const rows = await query('SELECT * FROM expenses WHERE date >= ? AND date <= ?', [startStr, endStr]);
  const total = rows.reduce((s, e) => s + e.amount, 0);

  const byCategoryMap = new Map();
  for (const e of rows) {
    const cur = byCategoryMap.get(e.category) || { category: e.category, total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    byCategoryMap.set(e.category, cur);
  }
  const byCategory = [...byCategoryMap.values()].sort((a, b) => b.total - a.total);

  res.json({ period, range: { start: startStr, end: endStr }, total, count: rows.length, byCategory });
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { category, description, amount, date, payment_method } = req.body;
  if (!category || !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Categoría inválida' });
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Fecha requerida (YYYY-MM-DD)' });
  if (payment_method && !PAYMENT_METHODS.includes(payment_method)) return res.status(400).json({ error: 'Método de pago inválido' });

  const result = await run(
    'INSERT INTO expenses (category, description, amount, date, payment_method, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [category, description || null, numAmount, date, payment_method || 'efectivo', req.user.id]
  );
  const row = await get('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(row);
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const existing = await get('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });

  const { category, description, amount, date, payment_method } = req.body;
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Categoría inválida' });
  if (amount !== undefined && (!Number(amount) || Number(amount) <= 0)) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Formato de fecha inválido' });
  if (payment_method && !PAYMENT_METHODS.includes(payment_method)) return res.status(400).json({ error: 'Método de pago inválido' });

  await run(
    'UPDATE expenses SET category = COALESCE(?, category), description = COALESCE(?, description), amount = COALESCE(?, amount), date = COALESCE(?, date), payment_method = COALESCE(?, payment_method) WHERE id = ?',
    [category, description, amount !== undefined ? Number(amount) : undefined, date, payment_method, req.params.id]
  );
  const row = await get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const existing = await get('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Gasto no encontrado' });
  await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export { CATEGORIES };
export default router;
