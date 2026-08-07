import { Router } from 'express';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import { normalizePhone } from '../lib/phone.js';

const router = Router();

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

router.post('/send', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'Número de teléfono inválido' });
  try {
    await getClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: 'sms' });
    res.json({ sent: true });
  } catch {
    res.status(502).json({ error: 'No se pudo enviar el código, intenta de nuevo' });
  }
});

router.post('/check', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();
  if (!phone || !code) return res.status(400).json({ error: 'Teléfono y código requeridos' });
  try {
    const check = await getClient().verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    if (check.status !== 'approved') return res.status(400).json({ error: 'Código incorrecto o expirado' });
    // Válido 90 días: el cliente lo guarda en su dispositivo para no re-verificar en cada pedido.
    const token = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ verified: true, token, phone });
  } catch {
    res.status(400).json({ error: 'Código incorrecto o expirado' });
  }
});

export default router;
