import Stripe from 'stripe';
import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

function notifyOrderUpdate(io, order) {
  if (io) io.emit('order:update', order);
}

router.get('/', authenticate, (req, res) => {
  let orders;
  const activeSql = "SELECT * FROM orders WHERE status != 'cancelado' AND (status != 'completado' OR payment_status != 'pagado') ORDER BY created_at DESC";
  if (req.user.role === 'admin' || req.user.role === 'cocina') {
    orders = query(activeSql);
  } else if (req.user.role === 'mesero') {
    orders = query(activeSql);
  } else {
    orders = query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
  }
  const ordersWithItems = orders.map(order => ({ ...order, items: query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) }));
  res.json(ordersWithItems);
});

router.get('/all', authenticate, authorize('admin', 'cocina'), (req, res) => {
  const orders = query("SELECT * FROM orders WHERE status != 'completado' AND status != 'cancelado' ORDER BY created_at DESC");
  res.json(orders.map(order => ({ ...order, items: query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
});

router.get('/history', authenticate, (req, res) => {
  let orders;
  if (req.user.role === 'cliente') {
    orders = query("SELECT * FROM orders WHERE user_id = ? AND status IN ('completado', 'cancelado') ORDER BY created_at DESC LIMIT 50", [req.user.id]);
  } else {
    orders = query("SELECT * FROM orders WHERE status IN ('completado', 'cancelado') ORDER BY created_at DESC LIMIT 100");
  }
  res.json(orders.map(order => ({ ...order, items: query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
});

router.get('/:id', authenticate, (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  order.items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  res.json(order);
});

router.post('/', authenticate, (req, res) => {
  const { customer_name, customer_phone, customer_address, mesa, order_type, items, notes, payment_method } = req.body;
  if (!customer_name || !order_type || !items || !items.length) return res.status(400).json({ error: 'Nombre, tipo de orden y al menos un producto requeridos' });

  let total = 0;
  const orderItems = items.map(item => {
    if (item.menu_item_id) {
      const menuItem = get('SELECT * FROM menu_items WHERE id = ?', [item.menu_item_id]);
      if (!menuItem) throw new Error(`Producto ${item.menu_item_id} no encontrado`);
      total += menuItem.price * item.quantity;
      return { name: menuItem.name, menu_item_id: menuItem.id, quantity: item.quantity, price: menuItem.price, notes: item.notes || null };
    }
    total += item.price * item.quantity;
    return { name: item.name, menu_item_id: null, quantity: item.quantity, price: item.price, notes: item.notes || null };
  });

  const result = run('INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, mesa, order_type, total, notes, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, customer_name, customer_phone || null, customer_address || null, mesa || null, order_type, total, notes || null, payment_method || 'efectivo']);
  const orderId = result.lastInsertRowid;

  for (const item of orderItems) {
    run('INSERT INTO order_items (order_id, menu_item_id, name, quantity, price, notes) VALUES (?, ?, ?, ?, ?, ?)', [orderId, item.menu_item_id, item.name, item.quantity, item.price, item.notes]);
  }

  const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
  order.items = query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  const io = req.app.get('io');
  notifyOrderUpdate(io, order);
  res.status(201).json(order);
});

router.post('/create-payment-intent', authenticate, async (req, res) => {
  const { order_id } = req.body;
  const order = get('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'mxn',
      metadata: { order_id: order.id }
    });
    run('UPDATE orders SET stripe_payment_intent_id = ?, payment_method = ?, payment_status = ? WHERE id = ?', [paymentIntent.id, 'tarjeta', 'pendiente', order.id]);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch {
    res.status(500).json({ error: 'Error al crear el pago' });
  }
});

router.put('/:id/status', authenticate, authorize('admin', 'cocina', 'mesero'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pendiente', 'preparando', 'listo', 'completado', 'cancelado'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  order.items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  notifyOrderUpdate(req.app.get('io'), order);
  res.json(order);
});

router.put('/:id/payment', authenticate, authorize('admin', 'mesero'), (req, res) => {
  const { payment_status } = req.body;
  if (!['pendiente', 'pagado', 'reembolsado'].includes(payment_status)) return res.status(400).json({ error: 'Estado inválido' });
  run('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_status, req.params.id]);
  res.json({ success: true });
});

router.get('/kitchen/active', (req, res) => {
  const orders = query("SELECT * FROM orders WHERE status IN ('pendiente', 'preparando', 'listo') ORDER BY CASE order_type WHEN 'local' THEN 0 ELSE 1 END, created_at ASC");
  res.json(orders.map(order => ({ ...order, items: query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
});

export default router;
