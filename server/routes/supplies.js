import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { currentWeekStart } from '../supplies.js';

const router = Router();

function parseSupply(row) {
  return { ...row, remaining: row.purchased - row.consumed };
}

router.get('/', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const rows = await query('SELECT * FROM supply_items ORDER BY sort_order, name');
  res.json(rows.map(parseSupply));
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, unit, purchased } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const existing = await get('SELECT id FROM supply_items WHERE name = ?', [name]);
  if (existing) return res.status(400).json({ error: 'Ya existe un insumo con ese nombre' });

  const purchasedNum = purchased !== undefined ? Number(purchased) : 0;
  if (Number.isNaN(purchasedNum) || purchasedNum < 0) return res.status(400).json({ error: 'Cantidad comprada inválida' });

  const result = await run(
    'INSERT INTO supply_items (name, unit, purchased, week_start) VALUES (?, ?, ?, ?)',
    [name, unit || 'pieza', purchasedNum, currentWeekStart()]
  );
  const row = await get('SELECT * FROM supply_items WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(parseSupply(row));
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const existing = await get('SELECT id FROM supply_items WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Insumo no encontrado' });
  const { name, unit, sort_order } = req.body;
  await run('UPDATE supply_items SET name = COALESCE(?, name), unit = COALESCE(?, unit), sort_order = COALESCE(?, sort_order) WHERE id = ?', [name, unit, sort_order, req.params.id]);
  const row = await get('SELECT * FROM supply_items WHERE id = ?', [req.params.id]);
  res.json(parseSupply(row));
});

router.put('/:id/purchase', authenticate, authorize('admin'), async (req, res) => {
  const existing = await get('SELECT id FROM supply_items WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Insumo no encontrado' });
  const { purchased } = req.body;
  const purchasedNum = Number(purchased);
  if (Number.isNaN(purchasedNum) || purchasedNum < 0) return res.status(400).json({ error: 'Cantidad comprada inválida' });

  await run('UPDATE supply_items SET purchased = ?, week_start = COALESCE(week_start, ?) WHERE id = ?', [purchasedNum, currentWeekStart(), req.params.id]);
  const row = await get('SELECT * FROM supply_items WHERE id = ?', [req.params.id]);
  res.json(parseSupply(row));
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  await run('DELETE FROM menu_item_supplies WHERE supply_item_id = ?', [req.params.id]);
  await run('DELETE FROM supply_items WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/recipes', authenticate, authorize('admin'), async (req, res) => {
  const { menu_item_id } = req.query;
  const rows = menu_item_id
    ? await query(`SELECT r.*, s.name as supply_name, s.unit as supply_unit FROM menu_item_supplies r JOIN supply_items s ON s.id = r.supply_item_id WHERE r.menu_item_id = ?`, [menu_item_id])
    : await query(`SELECT r.*, m.name as menu_item_name, s.name as supply_name, s.unit as supply_unit FROM menu_item_supplies r JOIN menu_items m ON m.id = r.menu_item_id JOIN supply_items s ON s.id = r.supply_item_id ORDER BY m.name, s.name`);
  res.json(rows);
});

router.post('/recipes', authenticate, authorize('admin'), async (req, res) => {
  const { menu_item_id, supply_item_id, quantity_per_unit } = req.body;
  if (!menu_item_id || !supply_item_id) return res.status(400).json({ error: 'Producto e insumo requeridos' });
  const qty = quantity_per_unit !== undefined ? Number(quantity_per_unit) : 1;
  if (!qty || qty <= 0) return res.status(400).json({ error: 'La cantidad por unidad debe ser mayor a cero' });

  const menuItem = await get('SELECT id FROM menu_items WHERE id = ?', [menu_item_id]);
  if (!menuItem) return res.status(404).json({ error: 'Producto no encontrado' });
  const supply = await get('SELECT id FROM supply_items WHERE id = ?', [supply_item_id]);
  if (!supply) return res.status(404).json({ error: 'Insumo no encontrado' });

  const existing = await get('SELECT id FROM menu_item_supplies WHERE menu_item_id = ? AND supply_item_id = ?', [menu_item_id, supply_item_id]);
  if (existing) {
    await run('UPDATE menu_item_supplies SET quantity_per_unit = ? WHERE id = ?', [qty, existing.id]);
    return res.json({ id: existing.id, menu_item_id, supply_item_id, quantity_per_unit: qty });
  }

  const result = await run('INSERT INTO menu_item_supplies (menu_item_id, supply_item_id, quantity_per_unit) VALUES (?, ?, ?)', [menu_item_id, supply_item_id, qty]);
  res.status(201).json({ id: result.lastInsertRowid, menu_item_id, supply_item_id, quantity_per_unit: qty });
});

router.delete('/recipes/:id', authenticate, authorize('admin'), async (req, res) => {
  await run('DELETE FROM menu_item_supplies WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/history', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { supply_item_id } = req.query;
  const rows = supply_item_id
    ? await query('SELECT * FROM supply_week_history WHERE supply_item_id = ? ORDER BY week_start DESC', [supply_item_id])
    : await query('SELECT * FROM supply_week_history ORDER BY week_start DESC, supply_name');
  res.json(rows);
});

export default router;
