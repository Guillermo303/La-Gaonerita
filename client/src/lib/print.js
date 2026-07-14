export function printTicket({ type, order, items, payments, cambio, subtotal, discount }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const lines = [];

  const add = (text = '', bold = false, size = 'normal', align = 'left') => lines.push({ text, bold, size, align });
  const center = (text, bold = false, size = 'normal') => lines.push({ text, bold, size, align: 'center' });
  const sep = () => lines.push({ text: '─'.repeat(32), bold: false, size: 'normal', align: 'center' });

  if (type === 'comanda') {
    center('LA GAONERITA', true, 'large');
    sep();
    center('ORDEN #' + order.id, true, 'large');
    center(dateStr, false, 'small');
    if (order.mesa) center('📍 ' + order.mesa, false, 'normal');
    if (order.customer_name) center('Cliente: ' + order.customer_name, false, 'small');
    if (order.order_type === 'domicilio') center('🛵 A DOMICILIO', true, 'normal');
    sep();
    items.forEach(item => {
      add(item.quantity + 'x ' + item.name, true);
      if (item.notes) add('   📝 ' + item.notes, false, 'small');
    });
    if (order.notes) { sep(); add('Nota general: ' + order.notes, false, 'small'); }
    sep();
    center('¡Buen provecho!');
  }

  if (type === 'recibo') {
    center('LA GAONERITA', true, 'large');
    center('Tacos y Más', false, 'small');
    sep();
    center('TICKET #' + order.id, true, 'large');
    center(dateStr, false, 'small');
    if (order.customer_name) center('Cliente: ' + order.customer_name, false, 'small');
    if (order.mesa) center(order.mesa, false, 'small');
    sep();
    items.forEach(item => {
      add(item.quantity + 'x ' + item.name, true);
      add('   ' + formatPrice(item.price * item.quantity), false, 'normal', 'right');
    });
    sep();
    if (discount > 0) {
      add('Subtotal:  ' + formatPrice(subtotal), false, 'normal', 'right');
      add('Descuento: -' + formatPrice(discount), false, 'small', 'right');
    }
    add('TOTAL:  ' + formatPrice(order.total), true, 'large', 'right');
    if (payments && payments.length > 0) {
      sep();
      payments.forEach(p => add(p.method + ':  ' + formatPrice(p.amount), false, 'normal', 'right'));
      add('Pagado:  ' + formatPrice(payments.reduce((s, p) => s + p.amount, 0)), true, 'normal', 'right');
    } else {
      add('Pagado', true);
    }
    if (cambio > 0) add('Cambio:  ' + formatPrice(cambio), false, 'normal', 'right');
    sep();
    center('¡Gracias por tu visita!');
    center('Síguenos en redes', false, 'small');
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title>
<style>
  @page { margin: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 0 auto; padding: 8px 0; color: #000; background: #fff; }
  .line { margin: 0; padding: 2px 8px; white-space: pre-wrap; word-break: break-all; }
  .bold { font-weight: bold; }
  .large { font-size: 16px; }
  .small { font-size: 10px; }
  .center { text-align: center; }
  .right { text-align: right; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  @media print { html, body { width: 72mm; } }
</style></head><body>
${lines.map(l => {
  const cls = [l.align === 'center' ? 'center' : '', l.align === 'right' ? 'right' : '', l.bold ? 'bold' : '', l.size !== 'normal' ? l.size : ''].filter(Boolean).join(' ');
  return `<div class="line ${cls}">${l.text.replace(/\n/g, '<br>')}</div>`;
}).join('\n')}
</body></html>`;

  const w = window.open('', '_blank', 'width=350,height=600');
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

function formatPrice(n) { return '$' + (parseFloat(n) || 0).toFixed(2); }
