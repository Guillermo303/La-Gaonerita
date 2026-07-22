import { formatPrice } from './utils';

const typeLabels = { local: 'Local', domicilio: 'Domicilio' };
const metodoLabels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

function receiptHTML(order, metodo) {
  const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  const items = (order.items || []).map(item => `
    <tr>
      <td class="qty">${item.quantity}x</td>
      <td class="name">${item.name}</td>
      <td class="price">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo #${order.id}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 80mm; margin: 0; padding: 6mm 4mm; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
  .center { text-align: center; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .muted { color: #333; font-size: 11px; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .qty { width: 28px; }
  .price { text-align: right; white-space: nowrap; }
  .total-row td { padding-top: 6px; font-weight: bold; font-size: 14px; }
  .stamp { text-align: center; font-weight: bold; font-size: 13px; margin-top: 10px; border: 2px solid #000; padding: 4px; }
  .footer { text-align: center; margin-top: 10px; font-size: 11px; }
</style>
</head>
<body>
  <div class="center">
    <h1>LA GAONERITA</h1>
    <div class="muted">Tacos artesanales</div>
  </div>
  <div class="line"></div>
  <div>Orden #${order.id}</div>
  <div class="muted">${fecha}</div>
  <div>${typeLabels[order.order_type] || order.order_type}${order.mesa ? ' · ' + order.mesa : ''}</div>
  <div>${order.customer_name || ''}</div>
  ${order.order_type === 'domicilio' && order.customer_address ? `<div class="muted">${order.customer_address}</div>` : ''}
  <div class="line"></div>
  <table>
    ${items}
  </table>
  <div class="line"></div>
  <table>
    <tr class="total-row"><td colspan="2">TOTAL</td><td class="price">${formatPrice(order.total)}</td></tr>
  </table>
  <div class="stamp">PAGADO · ${(metodoLabels[metodo] || metodo || '').toUpperCase()}</div>
  <div class="footer">¡Gracias por su compra!</div>
</body>
</html>`;
}

// Los navegadores solo permiten abrir una ventana nueva como respuesta directa
// a un clic. Si hay una espera (await) de por medio, la consideran un popup
// no solicitado y la bloquean. Por eso se abre la ventana en blanco de inmediato
// (openReceiptWindow, dentro del propio manejador de clic) y el contenido del
// recibo se rellena después, una vez que ya se sabe el resultado del cobro
// (writeReceipt).

export function openReceiptWindow() {
  return window.open('', '_blank', 'width=380,height=600');
}

export function writeReceipt(win, order, metodo) {
  if (!win || win.closed) return false;
  win.document.write(receiptHTML(order, metodo));
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
  return true;
}

// Atajo para imprimir de una vez cuando no hay una espera async entre el clic
// y la impresión (por ejemplo, el botón de reimprimir).
export function printReceipt(order, metodo) {
  const win = openReceiptWindow();
  return writeReceipt(win, order, metodo);
}
