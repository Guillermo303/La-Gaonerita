import { Router } from 'express';
import { query, get, run } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = query("SELECT * FROM settings");
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

router.put('/', authenticate, authorize('admin'), (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    const existing = get('SELECT * FROM settings WHERE key = ?', [key]);
    if (existing) {
      run('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
    } else {
      run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
  }
  const rows = query("SELECT * FROM settings");
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

export default router;
