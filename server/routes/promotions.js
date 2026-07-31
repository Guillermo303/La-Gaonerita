import { Router } from 'express';
import { query, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

function isValidToday(promo) {
  if (!promo.active) return false;
  const today = new Date().toLocaleDateString('en-CA');
  if (promo.schedule_type === 'weekly') {
    const dow = new Date().getDay();
    const days = (promo.days_of_week || '').split(',').filter(Boolean).map(Number);
    return days.includes(dow);
  }
  if (promo.start_date && today < promo.start_date) return false;
  if (promo.end_date && today > promo.end_date) return false;
  return true;
}

router.get('/', async (req, res) => {
  const promotions = await query('SELECT * FROM promotions ORDER BY created_at DESC');
  res.json(promotions.filter(isValidToday));
});

router.get('/all', authenticate, authorize('socio'), async (req, res) => {
  const promotions = await query('SELECT * FROM promotions ORDER BY created_at DESC');
  res.json(promotions);
});

router.post('/', authenticate, authorize('socio'), async (req, res) => {
  const { name, description, schedule_type, start_date, end_date, days_of_week } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (schedule_type && !['date_range', 'weekly'].includes(schedule_type)) return res.status(400).json({ error: 'Tipo de vigencia inválido' });
  const result = await run(
    'INSERT INTO promotions (name, description, schedule_type, start_date, end_date, days_of_week) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || null, schedule_type || 'date_range', start_date || null, end_date || null, days_of_week || null]
  );
  res.status(201).json({ id: result.lastInsertRowid, name });
});

router.put('/:id', authenticate, authorize('socio'), async (req, res) => {
  const { name, description, image, image_shape, image_zoom, image_pos_x, image_pos_y, active, schedule_type, start_date, end_date, days_of_week } = req.body;
  if (schedule_type && !['date_range', 'weekly'].includes(schedule_type)) return res.status(400).json({ error: 'Tipo de vigencia inválido' });
  await run(
    `UPDATE promotions SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      image = COALESCE(?, image),
      image_shape = COALESCE(?, image_shape),
      image_zoom = COALESCE(?, image_zoom),
      image_pos_x = COALESCE(?, image_pos_x),
      image_pos_y = COALESCE(?, image_pos_y),
      active = COALESCE(?, active),
      schedule_type = COALESCE(?, schedule_type),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      days_of_week = COALESCE(?, days_of_week)
    WHERE id = ?`,
    [name, description, image, image_shape, image_zoom, image_pos_x, image_pos_y, active, schedule_type, start_date, end_date, days_of_week, req.params.id]
  );
  res.json({ success: true });
});

router.delete('/:id', authenticate, authorize('socio'), async (req, res) => {
  await run('DELETE FROM promotions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
