import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run } from '../db.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

function mockNow(dateStr, hh = 12, mm = 0) {
  vi.setSystemTime(new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`));
  return () => vi.useRealTimers();
}

function toSqlUTC(dateStr, hh, mm) {
  const d = new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function createPaidOrder({ total, dateStr, hh = 14, mm = 0 }) {
  const timestamp = toSqlUTC(dateStr, hh, mm);
  const order = run(
    "INSERT INTO orders (user_id, customer_name, order_type, total, payment_method, payment_status, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pagado', 'completado', ?, ?)",
    [null, 'Cliente', 'local', total, 'efectivo', timestamp, timestamp]
  );
  return order.lastInsertRowid;
}

describe('Panorama financiero consolidado', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });
  afterEach(() => vi.useRealTimers());

  it('rechaza el acceso sin autenticación', async () => {
    const res = await request(app).get('/api/reports/finance');
    expect(res.status).toBe(401);
  });

  it('rechaza a quien no es admin ni socio', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/reports/finance').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it('permite al socio consultar el panorama financiero', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/reports/finance').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });

  it('incluye el valor total del patrimonio (activos)', async () => {
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Refrigerador', purchase_price: 12000, quantity: 1 });
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Sillas', purchase_price: 350, quantity: 20 });
    const res = await request(app).get('/api/reports/finance?period=day').set('Authorization', `Bearer ${token}`);
    expect(res.body.assets.totalValue).toBe(12000 + 20 * 350);
    expect(res.body.assets.totalItems).toBe(21);
    expect(res.body.assets.count).toBe(2);
  });

  it('calcula el margen de utilidad correctamente', async () => {
    const restore = mockNow('2026-08-05', 12, 0);
    const freshToken = await adminToken(app);
    createPaidOrder({ total: 1000, dateStr: '2026-08-05' });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${freshToken}`).send({ category: 'renta', amount: 200, date: '2026-08-05' });
    const res = await request(app).get('/api/reports/finance?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(1000);
    expect(res.body.expensesTotal).toBe(200);
    expect(res.body.profitEstimate).toBe(800);
    expect(res.body.margin).toBeCloseTo(80, 5);
    restore();
  });

  it('devuelve margen 0 cuando no hay ingresos', async () => {
    const restore = mockNow('2026-08-05', 12, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/finance?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(0);
    expect(res.body.margin).toBe(0);
    restore();
  });

  it('compara contra el periodo anterior (día)', async () => {
    createPaidOrder({ total: 500, dateStr: '2026-08-04' });
    createPaidOrder({ total: 1000, dateStr: '2026-08-05' });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/finance?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(1000);
    expect(res.body.previousPeriod.totalRevenue).toBe(500);
    expect(res.body.changePct.revenue).toBeCloseTo(100, 5);
    restore();
  });

  it('compara contra la semana anterior', async () => {
    createPaidOrder({ total: 300, dateStr: '2026-07-28' }); // martes de la semana previa
    createPaidOrder({ total: 900, dateStr: '2026-08-05' }); // miércoles de esta semana
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/finance?period=week&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(900);
    expect(res.body.previousPeriod.totalRevenue).toBe(300);
    restore();
  });

  it('compara contra el mes anterior', async () => {
    createPaidOrder({ total: 1000, dateStr: '2026-07-15' });
    createPaidOrder({ total: 2000, dateStr: '2026-08-15' });
    const restore = mockNow('2026-08-20', 12, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/finance?period=month&date=2026-08-15').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(2000);
    expect(res.body.previousPeriod.totalRevenue).toBe(1000);
    expect(res.body.changePct.revenue).toBeCloseTo(100, 5);
    restore();
  });

  it('devuelve 0% de cambio cuando ambos periodos están en cero', async () => {
    const restore = mockNow('2026-08-05', 12, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/finance?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.changePct.revenue).toBe(0);
    restore();
  });

  it('devuelve cambio nulo cuando el periodo anterior fue cero y el actual no', async () => {
    createPaidOrder({ total: 500, dateStr: '2026-08-05' });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/finance?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.changePct.revenue).toBeNull();
    restore();
  });
});
