import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

async function hasHistory(userId) {
  if (await get('SELECT id FROM orders WHERE user_id = ?', [userId])) return true;
  if (await get('SELECT id FROM sales_reports WHERE generated_by = ?', [userId])) return true;
  if (await get('SELECT id FROM expenses WHERE created_by = ?', [userId])) return true;
  return false;
}

router.get('/lookup', authenticate, authorize('socio'), async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  // El mismo email puede tener varias cuentas (una por rol), así que se
  // devuelven todas para que el admin elija cuál administrar.
  const users = await query('SELECT id, name, email, role, active, created_at FROM users WHERE email = ?', [email]);
  if (!users.length) return res.status(404).json({ error: 'No existe ninguna cuenta con ese email' });
  const withHistory = await Promise.all(users.map(async (u) => ({ ...u, hasHistory: await hasHistory(u.id) })));
  res.json(withHistory);
});

router.delete('/:id', authenticate, authorize('socio'), async (req, res) => {
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
