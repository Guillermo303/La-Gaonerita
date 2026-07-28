import { Router } from 'express';
import { run, get } from '../db.js';
import { getPaymentStatus } from '../mercadopago.js';

const router = Router();

// Mercado Pago llama esta URL cuando cambia el estado de un pago. Respondemos
// 200 de inmediato (así lo espera Mercado Pago) y procesamos después.
router.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const paymentId = req.body?.data?.id || req.query['data.id'];
    const type = req.body?.type || req.query.type;
    if (type !== 'payment' || !paymentId) return;

    const info = await getPaymentStatus(paymentId);
    if (!info || info.status !== 'approved' || !info.externalReference) return;

    const order = await get('SELECT * FROM orders WHERE id = ?', [info.externalReference]);
    if (!order || order.payment_status === 'pagado') return;

    await run('UPDATE orders SET payment_status = ? WHERE id = ?', ['pagado', order.id]);
    const io = req.app.get('io');
    if (io) io.emit('order:update', { ...order, payment_status: 'pagado' });
  } catch (err) {
    console.error('Error procesando webhook de Mercado Pago:', err.message);
  }
});

export default router;
