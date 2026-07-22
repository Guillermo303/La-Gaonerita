import { Router } from 'express';
import { query, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const mesas = query('SELECT * FROM mesas ORDER BY sort_order');
  const orders = query("SELECT id, mesa, status, total, payment_status, customer_name FROM orders WHERE order_type = 'local' AND status IN ('pendiente','preparando','listo','completado') ORDER BY created_at DESC");
  const today = new Date().toLocaleDateString('en-CA');
  const reservations = query("SELECT * FROM reservations WHERE date = ? AND status IN ('confirmada','ocupada') ORDER BY time", [today]);

  const result = mesas.map(m => {
    const activeOrders = orders.filter(o => o.mesa === m.name && o.status !== 'completado');
    const pendingPayment = orders.filter(o => o.mesa === m.name && o.status === 'completado' && o.payment_status !== 'pagado');
    const lastOrder = orders.find(o => o.mesa === m.name);
    const mesaReservations = reservations.filter(r => r.mesa_id === m.id);
    const activeReservation = mesaReservations.find(r => r.status === 'ocupada');
    const nextReservation = mesaReservations.find(r => r.status === 'confirmada');
    const shownReservation = activeReservation || nextReservation;

    let state = 'libre';
    if (pendingPayment.length) state = 'pendiente-pago';
    else if (activeOrders.length) state = 'ocupada';
    else if (activeReservation) state = 'ocupada';
    else if (nextReservation) state = 'reservada';

    return {
      ...m,
      state,
      activeOrders: activeOrders.length,
      pendingPayment: pendingPayment.length,
      lastCustomer: lastOrder?.customer_name || null,
      lastOrderId: lastOrder?.id || null,
      reservation: shownReservation ? {
        id: shownReservation.id,
        customer_name: shownReservation.customer_name,
        time: shownReservation.time,
        party_size: shownReservation.party_size,
        status: shownReservation.status
      } : null
    };
  });

  res.json(result);
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  run('INSERT INTO mesas (name) VALUES (?)', [name]);
  res.status(201).json({ success: true });
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, sort_order } = req.body;
  run('UPDATE mesas SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?', [name, sort_order, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  run('DELETE FROM mesas WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
