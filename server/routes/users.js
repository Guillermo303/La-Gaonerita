import { Router } from 'express';
import { get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

async function hasHistory(userId) {
  if (await get('SELECT id FROM orders WHERE user_id = ?', [userId])) return true;
  if (await get('SELECT id FROM sales_reports WHERE generated_by = ?', [userId])) return true;
  if (await get('SELECT id FROM expenses WHERE created_by = ?', [userId])) return true;
  return false;
}

router.get('/lookup', authenticate, authorize('admin'), async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  const user = await get('SELECT id, name, email, role, active, created_at FROM users WHERE email = ?', [email]);
  if (!user) return res.status(404).json({ error: 'No existe ninguna cuenta con ese email' });
  res.json({ ...user, hasHistory: await hasHistory(user.id) });
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  const user = await get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (await hasHistory(id)) return res.status(400).json({ error: 'Esta cuenta tiene historial de pedidos, reportes o gastos y no se puede eliminar; usa "Desactivar" en su lugar para bloquear el acceso sin perder el historial.' });

  await run('DELETE FROM employee_details WHERE user_id = ?', [id]);
  await run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true });
});

export default router;
