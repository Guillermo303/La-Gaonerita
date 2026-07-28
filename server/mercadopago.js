import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;

export const isConfigured = !!client;

function frontendUrl() {
  return (process.env.FRONTEND_URL || '').split(',')[0].trim() || 'http://localhost:5173';
}

// Sin Access Token configurado, regresa un link de demostración para que se
// pueda ver y probar todo el flujo (UI, guardado del link, etc.) antes de
// tener credenciales reales de Mercado Pago — en cuanto se configure
// MERCADOPAGO_ACCESS_TOKEN en el .env, esta misma función empieza a crear
// preferencias reales sin tocar nada más del código.
export async function createPaymentLink(order) {
  if (!client) {
    return { demo: true, link: `${frontendUrl()}/pago-demo/${order.id}`, preferenceId: null };
  }

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [{
        id: String(order.id),
        title: `Orden #${order.id} · La Gaonerita`,
        quantity: 1,
        unit_price: Number(order.total),
        currency_id: 'MXN'
      }],
      external_reference: String(order.id),
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
      back_urls: {
        success: `${frontendUrl()}/my-orders`,
        failure: `${frontendUrl()}/my-orders`,
        pending: `${frontendUrl()}/my-orders`
      },
      auto_return: 'approved'
    }
  });

  return { demo: false, link: result.init_point, preferenceId: result.id };
}

// Consulta el estado real de un pago en Mercado Pago (usado por el webhook).
export async function getPaymentStatus(paymentId) {
  if (!client) return null;
  const payment = new Payment(client);
  const result = await payment.get({ id: paymentId });
  return { status: result.status, externalReference: result.external_reference };
}
