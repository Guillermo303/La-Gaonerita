import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { buildSalesReport, saveReportSnapshot, buildBusinessHealth, buildFinancialOverview } from '../salesReports.js';

const router = Router();

function parseAnchor(period, date) {
  if (!['day', 'week', 'month'].includes(period)) return { error: 'Periodo inválido, usa day, week o month' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Formato de fecha inválido' };
  const anchor = date ? new Date(`${date}T12:00:00`) : new Date();
  return { anchor };
}

router.get('/sales', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { period = 'day', date } = req.query;
  const { anchor, error } = parseAnchor(period, date);
  if (error) return res.status(400).json({ error });

  const report = await buildSalesReport(period, anchor);
  if (!report) return res.status(400).json({ error: 'Periodo inválido' });
  res.json(report);
});

router.get('/health', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { period = 'day', date } = req.query;
  const { anchor, error } = parseAnchor(period, date);
  if (error) return res.status(400).json({ error });

  const health = await buildBusinessHealth(period, anchor);
  if (!health) return res.status(400).json({ error: 'Periodo inválido' });
  res.json(health);
});

router.get('/finance', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { period = 'day', date } = req.query;
  const { anchor, error } = parseAnchor(period, date);
  if (error) return res.status(400).json({ error });

  const overview = await buildFinancialOverview(period, anchor);
  if (!overview) return res.status(400).json({ error: 'Periodo inválido' });
  res.json(overview);
});

router.post('/sales/save', authenticate, authorize('admin'), async (req, res) => {
  const { period = 'day', date } = req.body;
  const { anchor, error } = parseAnchor(period, date);
  if (error) return res.status(400).json({ error });

  const saved = await saveReportSnapshot(period, anchor, { auto: false, generatedBy: req.user.id });
  if (!saved) return res.status(400).json({ error: 'Periodo inválido' });
  res.status(201).json({ success: true, id: saved.id, period: saved.period, date: saved.date });
});

router.get('/saved', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const { period } = req.query;
  const rows = period
    ? await query('SELECT id, period, date, range_start, range_end, total_revenue, order_count, auto, generated_by, created_at FROM sales_reports WHERE period = ? ORDER BY created_at DESC LIMIT 100', [period])
    : await query('SELECT id, period, date, range_start, range_end, total_revenue, order_count, auto, generated_by, created_at FROM sales_reports ORDER BY created_at DESC LIMIT 100');
  res.json(rows);
});

router.get('/saved/:id', authenticate, authorize('admin', 'socio'), async (req, res) => {
  const row = await get('SELECT * FROM sales_reports WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json({ ...row, data: JSON.parse(row.data) });
});

router.delete('/saved/:id', authenticate, authorize('admin'), async (req, res) => {
  await run('DELETE FROM sales_reports WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
