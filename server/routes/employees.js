import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const PERIODOS = ['semanal', 'quincenal', 'mensual'];

function today() {
  return new Date().toLocaleDateString('en-CA');
}

function parseEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    active: row.active,
    created_at: row.created_at,
    puesto: row.puesto || '',
    salario: row.salario || 0,
    periodo_pago: row.periodo_pago || 'semanal',
    prestaciones: (() => { try { return JSON.parse(row.prestaciones || '[]'); } catch { return []; } })(),
    dias_laborales: (() => { try { return JSON.parse(row.dias_laborales || '[]'); } catch { return []; } })(),
    fecha_contratacion: row.fecha_contratacion || null,
    fecha_baja: row.fecha_baja || null
  };
}

const SELECT_EMPLOYEES = `
  SELECT u.id, u.name, u.email, u.role, u.phone, u.active, u.created_at,
         d.puesto, d.salario, d.periodo_pago, d.prestaciones, d.dias_laborales, d.fecha_contratacion, d.fecha_baja
  FROM users u
  LEFT JOIN employee_details d ON d.user_id = u.id
  WHERE u.role != 'cliente'
`;

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const rows = await query(`${SELECT_EMPLOYEES} ORDER BY u.active DESC, u.name ASC`);
  res.json(rows.map(parseEmployee));
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, phone, role, puesto, salario, periodo_pago, prestaciones, dias_laborales } = req.body;

  if (!name || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  const allowedRole = ['admin', 'cocina', 'mesero'].includes(role) ? role : 'mesero';
  if (periodo_pago && !PERIODOS.includes(periodo_pago)) return res.status(400).json({ error: 'Periodo de pago inválido' });

  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name, email, hash, phone || null, allowedRole]);
  const userId = result.lastInsertRowid;

  await run(`INSERT INTO employee_details (user_id, puesto, salario, periodo_pago, prestaciones, dias_laborales, fecha_contratacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, puesto || '', parseFloat(salario) || 0, periodo_pago || 'semanal', JSON.stringify(prestaciones || []), JSON.stringify(dias_laborales || []), today()]);

  const row = await get(`${SELECT_EMPLOYEES} AND u.id = ?`, [userId]);
  res.status(201).json(parseEmployee(row));
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, phone, role, puesto, salario, periodo_pago, prestaciones, dias_laborales } = req.body;
  const id = Number(req.params.id);
  const target = await get('SELECT id FROM users WHERE id = ? AND role != \'cliente\'', [id]);
  if (!target) return res.status(404).json({ error: 'Empleado no encontrado' });
  if (periodo_pago && !PERIODOS.includes(periodo_pago)) return res.status(400).json({ error: 'Periodo de pago inválido' });
  const allowedRole = role && ['admin', 'cocina', 'mesero'].includes(role) ? role : null;

  await run('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), role = COALESCE(?, role) WHERE id = ?', [name, phone, allowedRole, id]);

  const existingDetails = await get('SELECT user_id FROM employee_details WHERE user_id = ?', [id]);
  if (existingDetails) {
    await run(`UPDATE employee_details SET
           puesto = COALESCE(?, puesto),
           salario = COALESCE(?, salario),
           periodo_pago = COALESCE(?, periodo_pago),
           prestaciones = COALESCE(?, prestaciones),
           dias_laborales = COALESCE(?, dias_laborales)
         WHERE user_id = ?`,
      [puesto, salario !== undefined ? parseFloat(salario) : undefined, periodo_pago,
       prestaciones !== undefined ? JSON.stringify(prestaciones) : undefined,
       dias_laborales !== undefined ? JSON.stringify(dias_laborales) : undefined, id]);
  } else {
    await run(`INSERT INTO employee_details (user_id, puesto, salario, periodo_pago, prestaciones, dias_laborales, fecha_contratacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, puesto || '', parseFloat(salario) || 0, periodo_pago || 'semanal', JSON.stringify(prestaciones || []), JSON.stringify(dias_laborales || []), today()]);
  }

  const row = await get(`${SELECT_EMPLOYEES} AND u.id = ?`, [id]);
  res.json(parseEmployee(row));
});

router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  const { active } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'Estado inválido' });
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes despedir o desactivar tu propia cuenta' });
  const target = await get('SELECT id FROM users WHERE id = ? AND role != \'cliente\'', [id]);
  if (!target) return res.status(404).json({ error: 'Empleado no encontrado' });

  const existingDetails = await get('SELECT user_id FROM employee_details WHERE user_id = ?', [id]);
  if (!existingDetails) {
    await run(`INSERT INTO employee_details (user_id, fecha_contratacion) VALUES (?, ?)`, [id, today()]);
  }

  if (active) {
    await run('UPDATE users SET active = 1 WHERE id = ?', [id]);
    await run('UPDATE employee_details SET fecha_baja = NULL WHERE user_id = ?', [id]);
  } else {
    // Al despedir se incrementa token_version: cualquier sesión ya iniciada
    // deja de ser válida de inmediato, sin esperar a que expire el token.
    await run('UPDATE users SET active = 0, token_version = token_version + 1 WHERE id = ?', [id]);
    await run('UPDATE employee_details SET fecha_baja = ? WHERE user_id = ?', [today(), id]);
  }

  const row = await get(`${SELECT_EMPLOYEES} AND u.id = ?`, [id]);
  res.json(parseEmployee(row));
});

export default router;
