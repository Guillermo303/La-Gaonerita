import { Router } from 'express';
import { query, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const OPEN_MINUTES = 12 * 60; // 12:00
const CLOSE_MINUTES = 22 * 60; // última hora para reservar: 22:00
const DURATION_MINUTES = 90;

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function overlaps(aMin, bMin) {
  return Math.abs(aMin - bMin) < DURATION_MINUTES;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

router.get('/', authenticate, authorize('admin', 'mesero'), (req, res) => {
  const { date } = req.query;
  const rows = date
    ? query('SELECT r.*, m.name as mesa_name FROM reservations r JOIN mesas m ON m.id = r.mesa_id WHERE r.date = ? ORDER BY r.time', [date])
    : query('SELECT r.*, m.name as mesa_name FROM reservations r JOIN mesas m ON m.id = r.mesa_id WHERE r.date >= ? ORDER BY r.date, r.time', [todayStr()]);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { customer_name, customer_phone, party_size, date, time, notes } = req.body;
  if (!customer_name || !customer_phone || !date || !time) {
    return res.status(400).json({ error: 'Nombre, teléfono, fecha y hora son requeridos' });
  }

  const size = Number(party_size) || 2;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Formato de fecha u hora inválido' });
  }

  const requestedMin = toMinutes(time);
  if (requestedMin < OPEN_MINUTES || requestedMin > CLOSE_MINUTES) {
    return res.status(400).json({ error: 'Horario de reservaciones: 12:00 a 22:00' });
  }

  const today = todayStr();
  if (date < today) return res.status(400).json({ error: 'La fecha ya pasó' });
  if (date === today) {
    const now = new Date();
    if (requestedMin <= now.getHours() * 60 + now.getMinutes()) {
      return res.status(400).json({ error: 'Elige una hora posterior a la actual' });
    }
  }

  const mesas = query('SELECT * FROM mesas WHERE capacity >= ? ORDER BY capacity, sort_order', [size]);
  const existing = query("SELECT * FROM reservations WHERE date = ? AND status IN ('confirmada','ocupada')", [date]);

  const mesa = mesas.find(m => {
    const conflicts = existing.filter(r => r.mesa_id === m.id);
    return !conflicts.some(r => overlaps(toMinutes(r.time), requestedMin));
  });

  if (!mesa) {
    return res.status(409).json({ error: 'No hay mesas disponibles para esa fecha y hora, intenta con otro horario' });
  }

  const { lastInsertRowid } = run(
    'INSERT INTO reservations (mesa_id, customer_name, customer_phone, party_size, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [mesa.id, customer_name, customer_phone, size, date, time, notes || null]
  );

  res.status(201).json({ success: true, id: lastInsertRowid, mesa: mesa.name });
});

router.put('/:id/status', authenticate, authorize('admin', 'mesero'), (req, res) => {
  const { status } = req.body;
  if (!['confirmada', 'ocupada', 'completada', 'cancelada'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  run('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', authenticate, authorize('admin', 'mesero'), (req, res) => {
  run('DELETE FROM reservations WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
