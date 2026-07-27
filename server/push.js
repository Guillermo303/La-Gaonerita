import webpush from 'web-push';
import { query, run } from './db.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:contacto@laganerita.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// Manda una notificación push a todos los usuarios con alguno de estos roles
// (típicamente mesero + admin). Si una suscripción ya expiró o el usuario
// desinstaló la app, el navegador respondería 404/410 — en ese caso la
// borramos para no seguir intentando en vano.
export async function sendPushToRoles(roles, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const placeholders = roles.map(() => '?').join(',');
  const subs = await query(
    `SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id WHERE u.role IN (${placeholders})`,
    roles
  );

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await run('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
      } else {
        console.error('Error enviando push:', err.statusCode || err.message);
      }
    }
  }));
}
