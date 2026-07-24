import { Router } from 'express';
import { query, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const groups = await query('SELECT * FROM customization_groups ORDER BY sort_order');
  const options = await query('SELECT * FROM customization_options ORDER BY sort_order');
  res.json(groups.map(g => ({ ...g, options: options.filter(o => o.group_id === g.id) })));
});

router.post('/groups', authenticate, authorize('admin'), async (req, res) => {
  const { name, selection_type } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (selection_type && !['single', 'multiple'].includes(selection_type)) return res.status(400).json({ error: 'Tipo de selección inválido' });
  const result = await run('INSERT INTO customization_groups (name, selection_type) VALUES (?, ?)', [name, selection_type || 'single']);
  res.status(201).json({ id: result.lastInsertRowid, name, selection_type: selection_type || 'single', options: [] });
});

router.put('/groups/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, selection_type, sort_order } = req.body;
  if (selection_type && !['single', 'multiple'].includes(selection_type)) return res.status(400).json({ error: 'Tipo de selección inválido' });
  await run('UPDATE customization_groups SET name = COALESCE(?, name), selection_type = COALESCE(?, selection_type), sort_order = COALESCE(?, sort_order) WHERE id = ?', [name, selection_type, sort_order, req.params.id]);
  res.json({ success: true });
});

router.delete('/groups/:id', authenticate, authorize('admin'), async (req, res) => {
  await run('DELETE FROM customization_options WHERE group_id = ?', [req.params.id]);
  await run('DELETE FROM customization_groups WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.post('/groups/:groupId/options', authenticate, authorize('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const result = await run('INSERT INTO customization_options (group_id, name) VALUES (?, ?)', [req.params.groupId, name]);
  res.status(201).json({ id: result.lastInsertRowid, group_id: Number(req.params.groupId), name });
});

router.put('/options/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, sort_order } = req.body;
  await run('UPDATE customization_options SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?', [name, sort_order, req.params.id]);
  res.json({ success: true });
});

router.delete('/options/:id', authenticate, authorize('admin'), async (req, res) => {
  await run('DELETE FROM customization_options WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
