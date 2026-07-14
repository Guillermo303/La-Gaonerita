import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ─── Inventory CRUD ───

router.get('/inventory', authenticate, authorize('admin', 'mesero', 'cocina'), (req, res) => {
  const items = query("SELECT * FROM inventory ORDER BY category, name");
  res.json(items);
});

router.post('/inventory', authenticate, authorize('admin'), (req, res) => {
  const { name, category, stock, unit, min_stock, cost_price } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const r = run('INSERT INTO inventory (name, category, stock, unit, min_stock, cost_price) VALUES (?, ?, ?, ?, ?, ?)',
    [name, category || 'general', stock ?? 0, unit || 'pieza', min_stock ?? 5, cost_price ?? 0]);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/inventory/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, category, stock, unit, min_stock, cost_price } = req.body;
  run(`UPDATE inventory SET
    name = COALESCE(?, name), category = COALESCE(?, category), stock = COALESCE(?, stock),
    unit = COALESCE(?, unit), min_stock = COALESCE(?, min_stock), cost_price = COALESCE(?, cost_price),
    updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, category, stock, unit, min_stock, cost_price, req.params.id]);
  res.json({ success: true });
});

router.put('/inventory/:id/stock', authenticate, authorize('admin', 'mesero', 'cocina'), (req, res) => {
  const { stock } = req.body;
  if (stock === undefined) return res.status(400).json({ error: 'Stock requerido' });
  run('UPDATE inventory SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [stock, req.params.id]);
  res.json({ success: true });
});

router.delete('/inventory/:id', authenticate, authorize('admin'), (req, res) => {
  run('DELETE FROM inventory WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ─── Reports ───

router.get('/reports/sales', authenticate, authorize('admin', 'mesero'), (req, res) => {
  const { start, end } = req.query;
  const hasDates = start || end;
  let whereClauses = ["payment_status = 'pagado'"];
  const params = [];
  if (start) { whereClauses.push('created_at >= ?'); params.push(start); }
  if (end) { whereClauses.push('created_at <= ?'); params.push(end); }
  const whereStr = 'WHERE ' + whereClauses.join(' AND ');

  const totalSales = query(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM orders ${whereStr}`, params);
  const byPayment = query(`SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM orders ${whereStr} GROUP BY payment_method`, params);
  const topItems = query(`SELECT oi.name, SUM(oi.quantity) as qty, SUM(oi.quantity * oi.price) as total FROM order_items oi JOIN orders o ON o.id = oi.order_id ${whereStr.replace('payment_status', 'o.payment_status').replace('created_at', 'o.created_at')} GROUP BY oi.name ORDER BY qty DESC LIMIT 10`, params);
  const byType = query(`SELECT order_type, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM orders ${whereStr} GROUP BY order_type`, params);
  const lowStock = query("SELECT * FROM inventory WHERE stock <= min_stock ORDER BY stock ASC");

  res.json({ total: totalSales[0], byPayment, topItems, byType, lowStock });
});

router.get('/reports/daily', authenticate, authorize('admin', 'mesero'), (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const data = query(`SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total),0) as total FROM orders WHERE payment_status = 'pagado' AND created_at >= DATE('now', ?) GROUP BY DATE(created_at) ORDER BY date DESC`, [`-${days} days`]);
  res.json(data);
});

export default router;
