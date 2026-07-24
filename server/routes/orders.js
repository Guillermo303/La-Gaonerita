import Stripe from 'stripe';
import { Router } from 'express';
import { query, get, run, withTransaction } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { decrementStock } from '../inventory.js';
import { decrementSuppliesForOrder } from '../supplies.js';

const router = Router();

function notifyOrderUpdate(io, order) {
  if (io) io.emit('order:update', order);
}

router.get('/', authenticate, async (req, res) => {
  let orders;
  const activeSql = "SELECT * FROM orders WHERE status != 'cancelado' AND (status != 'completado' OR payment_status != 'pagado') ORDER BY created_at DESC";
  if (req.user.role === 'admin' || req.user.role === 'cocina') {
    orders = await query(activeSql);
  } else if (req.user.role === 'mesero') {
    orders = await query(activeSql);
  } else {
    orders = await query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
  }
  const ordersWithItems = await Promise.all(orders.map(async order => ({ ...order, items: await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
  res.json(ordersWithItems);
});

router.get('/all', authenticate, authorize('admin', 'cocina'), async (req, res) => {
  const orders = await query("SELECT * FROM orders WHERE status != 'completado' AND status != 'cancelado' ORDER BY created_at DESC");
  const ordersWithItems = await Promise.all(orders.map(async order => ({ ...order, items: await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
  res.json(ordersWithItems);
});

router.get('/history', authenticate, async (req, res) => {
  let orders;
  if (req.user.role === 'cliente') {
    orders = await query("SELECT * FROM orders WHERE user_id = ? AND status IN ('completado', 'cancelado') ORDER BY created_at DESC LIMIT 50", [req.user.id]);
  } else {
    orders = await query("SELECT * FROM orders WHERE status IN ('completado', 'cancelado') ORDER BY created_at DESC LIMIT 100");
  }
  const ordersWithItems = await Promise.all(orders.map(async order => ({ ...order, items: await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
  res.json(ordersWithItems);
});

router.get('/recommendations', authenticate, async (req, res) => {
  const orders = await query("SELECT id, created_at FROM orders WHERE user_id = ? AND status = 'completado'", [req.user.id]);
  const distinctDays = new Set(orders.map(o => new Date(o.created_at + 'Z').toLocaleDateString('en-CA')));
  if (distinctDays.size < 5 || !orders.length) return res.json({ eligible: false, items: [] });

  const orderIds = orders.map(o => o.id);
  const placeholders = orderIds.map(() => '?').join(',');
  const ranked = await query(
    `SELECT menu_item_id, SUM(quantity) as total_qty FROM order_items WHERE order_id IN (${placeholders}) AND menu_item_id IS NOT NULL GROUP BY menu_item_id ORDER BY total_qty DESC LIMIT 3`,
    orderIds
  );

  const menuItemIds = ranked.map(r => r.menu_item_id);
  if (!menuItemIds.length) return res.json({ eligible: true, items: [] });
  const menuPlaceholders = menuItemIds.map(() => '?').join(',');
  const menuItems = await query(`SELECT * FROM menu_items WHERE id IN (${menuPlaceholders}) AND available = 1`, menuItemIds);

  const items = ranked.map(r => menuItems.find(m => m.id === r.menu_item_id)).filter(Boolean);
  res.json({ eligible: true, items });
});

router.get('/:id', authenticate, async (req, res) => {
  const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  order.items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  res.json(order);
});

router.post('/', authenticate, async (req, res) => {
  const { customer_name, customer_phone, customer_address, mesa, order_type, items, notes, payment_method, quick_sale, payment_status } = req.body;
  if (!customer_name || !order_type || !items || !items.length) return res.status(400).json({ error: 'Nombre, tipo de orden y al menos un producto requeridos' });

  try {
    const order = await withTransaction(async (db) => {
      if (quick_sale) {
        for (const item of items) {
          if (!item.menu_item_id) throw new Error('La compra rápida solo admite productos del menú');
          const menuItem = await db.get('SELECT ready_to_serve FROM menu_items WHERE id = ?', [item.menu_item_id]);
          if (!menuItem) throw new Error(`Producto ${item.menu_item_id} no encontrado`);
          if (!menuItem.ready_to_serve) throw new Error('Uno o más productos requieren preparación y no pueden venderse como compra rápida');
        }
      }

      let total = 0;
      const orderItems = [];
      for (const item of items) {
        if (item.menu_item_id) {
          const menuItem = await db.get('SELECT * FROM menu_items WHERE id = ?', [item.menu_item_id]);
          if (!menuItem) throw new Error(`Producto ${item.menu_item_id} no encontrado`);
          total += menuItem.price * item.quantity;
          orderItems.push({ name: menuItem.name, menu_item_id: menuItem.id, quantity: item.quantity, price: menuItem.price, notes: item.notes || null });
        } else {
          total += item.price * item.quantity;
          orderItems.push({ name: item.name, menu_item_id: null, quantity: item.quantity, price: item.price, notes: item.notes || null });
        }
      }

      const initialStatus = quick_sale ? 'completado' : 'pendiente';
      const initialPaymentStatus = ['pendiente', 'pagado', 'reembolsado'].includes(payment_status) ? payment_status : 'pendiente';

      const result = await db.run('INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, mesa, order_type, total, notes, payment_method, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, customer_name, customer_phone || null, customer_address || null, mesa || null, order_type, total, notes || null, payment_method || 'efectivo', initialStatus, initialPaymentStatus]);
      const orderId = result.lastInsertRowid;

      for (const item of orderItems) {
        await db.run('INSERT INTO order_items (order_id, menu_item_id, name, quantity, price, notes) VALUES (?, ?, ?, ?, ?, ?)', [orderId, item.menu_item_id, item.name, item.quantity, item.price, item.notes]);
      }

      const created = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
      created.items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      created._orderItems = orderItems;
      return created;
    });

    for (const item of order.items) {
      if (item.menu_item_id) await decrementStock(item.menu_item_id, item.quantity);
    }
    await decrementSuppliesForOrder(order._orderItems);
    delete order._orderItems;

    const io = req.app.get('io');
    notifyOrderUpdate(io, order);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo crear la orden' });
  }
});

router.post('/create-payment-intent', authenticate, async (req, res) => {
  const { order_id } = req.body;
  const order = await get('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'mxn',
      metadata: { order_id: order.id }
    });
    await run('UPDATE orders SET stripe_payment_intent_id = ?, payment_method = ?, payment_status = ? WHERE id = ?', [paymentIntent.id, 'tarjeta', 'pendiente', order.id]);
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch {
    res.status(500).json({ error: 'Error al crear el pago' });
  }
});

router.put('/:id/status', authenticate, authorize('admin', 'cocina', 'mesero'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pendiente', 'preparando', 'listo', 'completado', 'cancelado'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
  const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  order.items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  notifyOrderUpdate(req.app.get('io'), order);
  res.json(order);
});

router.put('/:id/payment', authenticate, authorize('admin', 'mesero'), async (req, res) => {
  const { payment_status } = req.body;
  if (!['pendiente', 'pagado', 'reembolsado'].includes(payment_status)) return res.status(400).json({ error: 'Estado inválido' });
  await run('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_status, req.params.id]);
  res.json({ success: true });
});

router.get('/kitchen/active', authenticate, authorize('admin', 'cocina', 'mesero'), async (req, res) => {
  const orders = await query("SELECT * FROM orders WHERE status IN ('pendiente', 'preparando', 'listo') ORDER BY CASE order_type WHEN 'local' THEN 0 ELSE 1 END, created_at ASC");
  const ordersWithItems = await Promise.all(orders.map(async order => ({ ...order, items: await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]) })));
  res.json(ordersWithItems);
});

export default router;
