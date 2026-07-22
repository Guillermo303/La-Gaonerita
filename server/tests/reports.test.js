import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run, query, get } from '../db.js';
import { autoArchiveDailyReport } from '../salesReports.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

function mockNow(dateStr, hh, mm) {
  vi.setSystemTime(new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`));
  return () => vi.useRealTimers();
}

function toSqlUTC(dateStr, hh, mm) {
  const d = new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function createPaidOrder({ menuItemId, name, price, quantity, total, dateStr, hh, mm, payment_method = 'efectivo' }) {
  const timestamp = toSqlUTC(dateStr, hh, mm);
  const order = run(
    "INSERT INTO orders (user_id, customer_name, order_type, total, payment_method, payment_status, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pagado', 'completado', ?, ?)",
    [null, 'Cliente', 'local', total, payment_method, timestamp, timestamp]
  );
  run('INSERT INTO order_items (order_id, menu_item_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)', [order.lastInsertRowid, menuItemId || null, name, quantity, price]);
  return order.lastInsertRowid;
}

describe('Reporte de ventas', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });
  afterEach(() => vi.useRealTimers());

  it('rechaza el acceso sin autenticación', async () => {
    const res = await request(app).get('/api/reports/sales');
    expect(res.status).toBe(401);
  });

  it('rechaza a quien no es admin', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/reports/sales').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it('rechaza un periodo inválido', async () => {
    const res = await request(app).get('/api/reports/sales?period=year').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('calcula el total de ventas e ingresos del día', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 2, total: 50, dateStr: '2026-08-05', hh: 14, mm: 0 });
    createPaidOrder({ name: 'Taco', price: 25, quantity: 4, total: 100, dateStr: '2026-08-05', hh: 20, mm: 0 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBe(150);
    expect(res.body.orderCount).toBe(2);
    expect(res.body.avgTicket).toBe(75);
    restore();
  });

  it('no incluye órdenes no pagadas ni de otros días', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restoreOther = mockNow('2026-08-06', 14, 0);
    run("INSERT INTO orders (customer_name, order_type, total, payment_status, status) VALUES (?, ?, ?, 'pendiente', 'completado')", ['Cliente', 'local', 999]);
    restoreOther();
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(25);
    expect(res.body.orderCount).toBe(1);
    restore();
  });

  it('identifica el producto más vendido por cantidad', async () => {
    createPaidOrder({ name: 'Taco al Pastor', price: 25, quantity: 10, total: 250, dateStr: '2026-08-05', hh: 14, mm: 0 });
    createPaidOrder({ name: 'Gringa', price: 50, quantity: 2, total: 100, dateStr: '2026-08-05', hh: 15, mm: 0 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.topProducts[0].name).toBe('Taco al Pastor');
    expect(res.body.topProducts[0].quantity).toBe(10);
    restore();
  });

  it('identifica la hora pico correctamente', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0 });
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 20, mm: 0 });
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 20, mm: 30 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.peakHour.hour).toBe(20);
    expect(res.body.peakHour.orders).toBe(2);
    restore();
  });

  it('agrupa las ventas por día dentro de la semana', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-03', hh: 14, mm: 0 });
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-04', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-05', 10, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=week&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.daily.length).toBe(2);
    expect(res.body.totalRevenue).toBe(50);
    restore();
  });

  it('agrupa por método de pago', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0, payment_method: 'efectivo' });
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 15, mm: 0, payment_method: 'tarjeta' });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.paymentBreakdown.length).toBe(2);
    restore();
  });

  it('devuelve peakHour nulo cuando no hay ventas en el periodo', async () => {
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const res = await request(app).get('/api/reports/sales?period=day&date=2026-08-05').set('Authorization', `Bearer ${freshToken}`);
    expect(res.body.totalRevenue).toBe(0);
    expect(res.body.peakHour).toBeNull();
    restore();
  });
});

describe('Guardado de reportes en base de datos', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });
  afterEach(() => vi.useRealTimers());

  it('rechaza guardar un reporte sin autenticación', async () => {
    const res = await request(app).post('/api/reports/sales/save').send({ period: 'day' });
    expect(res.status).toBe(401);
  });

  it('rechaza a quien no es admin al guardar', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${login.body.token}`).send({ period: 'day' });
    expect(res.status).toBe(403);
  });

  it('guarda un reporte manualmente y aparece en la lista de guardados', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 2, total: 50, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const save = await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${freshToken}`).send({ period: 'day', date: '2026-08-05' });
    expect(save.status).toBe(201);
    expect(save.body.id).toBeTruthy();

    const list = await request(app).get('/api/reports/saved').set('Authorization', `Bearer ${freshToken}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
    expect(list.body[0].total_revenue).toBe(50);
    expect(list.body[0].auto).toBe(0);
    restore();
  });

  it('recupera el detalle completo de un reporte guardado, incluyendo los datos', async () => {
    createPaidOrder({ name: 'Taco al Pastor', price: 25, quantity: 3, total: 75, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const save = await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${freshToken}`).send({ period: 'day', date: '2026-08-05' });
    const detail = await request(app).get(`/api/reports/saved/${save.body.id}`).set('Authorization', `Bearer ${freshToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.totalRevenue).toBe(75);
    expect(detail.body.data.topProducts[0].name).toBe('Taco al Pastor');
    restore();
  });

  it('devuelve 404 al pedir un reporte guardado que no existe', async () => {
    const res = await request(app).get('/api/reports/saved/9999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('permite eliminar un reporte guardado', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    const save = await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${freshToken}`).send({ period: 'day', date: '2026-08-05' });
    const del = await request(app).delete(`/api/reports/saved/${save.body.id}`).set('Authorization', `Bearer ${freshToken}`);
    expect(del.status).toBe(200);
    const detail = await request(app).get(`/api/reports/saved/${save.body.id}`).set('Authorization', `Bearer ${freshToken}`);
    expect(detail.status).toBe(404);
    restore();
  });

  it('filtra la lista de guardados por periodo', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-05', 22, 0);
    const freshToken = await adminToken(app);
    await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${freshToken}`).send({ period: 'day', date: '2026-08-05' });
    await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${freshToken}`).send({ period: 'week', date: '2026-08-05' });
    const list = await request(app).get('/api/reports/saved?period=week').set('Authorization', `Bearer ${freshToken}`);
    expect(list.body.length).toBe(1);
    expect(list.body[0].period).toBe('week');
    restore();
  });
});

describe('Archivo automático diario de reportes', () => {
  let app;
  beforeEach(async () => {
    app = await freshApp();
  });
  afterEach(() => vi.useRealTimers());

  it('archiva el reporte del día anterior una vez que empieza un nuevo día', () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 4, total: 100, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-06', 1, 0);
    const didArchive = autoArchiveDailyReport();
    expect(didArchive).toBe(true);
    const saved = query("SELECT * FROM sales_reports WHERE period = 'day' AND date = '2026-08-05' AND auto = 1");
    expect(saved.length).toBe(1);
    expect(saved[0].total_revenue).toBe(100);
    restore();
  });

  it('no vuelve a archivar si ya corrió hoy', () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0 });
    const restore = mockNow('2026-08-06', 1, 0);
    autoArchiveDailyReport();
    const second = autoArchiveDailyReport();
    expect(second).toBe(false);
    const saved = query("SELECT * FROM sales_reports WHERE period = 'day' AND date = '2026-08-05' AND auto = 1");
    expect(saved.length).toBe(1);
    restore();
  });

  it('no duplica el archivo automático si ya se guardó manualmente ese día', async () => {
    createPaidOrder({ name: 'Taco', price: 25, quantity: 1, total: 25, dateStr: '2026-08-05', hh: 14, mm: 0 });
    let restore = mockNow('2026-08-05', 22, 0);
    const token = await adminToken(app);
    await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${token}`).send({ period: 'day', date: '2026-08-05' });
    restore();

    restore = mockNow('2026-08-06', 1, 0);
    autoArchiveDailyReport();
    const saved = query("SELECT * FROM sales_reports WHERE period = 'day' AND date = '2026-08-05'");
    expect(saved.length).toBe(2);
    const autoSaved = saved.filter(r => r.auto === 1);
    expect(autoSaved.length).toBe(1);
    restore();
  });
});
