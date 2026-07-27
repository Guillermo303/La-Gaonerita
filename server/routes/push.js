import { Router } from 'express';
import { run } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

router.post('/subscribe', authenticate, async (req, res) => {
  const { endpoint, keys } = req.body.subscription || req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ error: 'Suscripción inválida' });
  await run(
    'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth',
    [req.user.id, endpoint, keys.p256dh, keys.auth]
  );
  res.status(201).json({ success: true });
});

router.post('/unsubscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  res.json({ success: true });
});

export default router;
