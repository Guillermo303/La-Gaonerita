const PHONE = '525512345678';

export function waLink(phone, message) {
  const p = (phone || PHONE).replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(message);
  return `https://wa.me/52${p}?text=${msg}`;
}

export function notifyOrderReady(order) {
  const msg = `🟢 *LA GAONERITA* - Tu orden #${order.id} está LISTA 🎉

${order.items?.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}

📍 ${order.mesa || 'Sucursal'}
💰 Total: $${order.total}

¡Pasa por ella! 🎊`;
  return waLink(order.customer_phone, msg);
}

export function notifyOrderPreparing(order) {
  const msg = `👨‍🍳 *LA GAONERITA* - Tu orden #${order.id} ya está en preparación

${order.items?.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}

Te avisaremos cuando esté lista. ¡Gracias por tu paciencia! 🙌`;
  return waLink(order.customer_phone, msg);
}

export function notifyNewOrder(order) {
  const msg = `✅ *LA GAONERITA* - Orden #${order.id} recibida

${order.items?.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}

📍 ${order.mesa || (order.order_type === 'domicilio' ? 'A domicilio' : 'Sucursal')}
💰 Total: $${order.total}

¡Estamos preparando todo para ti! 🔥`;
  return waLink(order.customer_phone, msg);
}
