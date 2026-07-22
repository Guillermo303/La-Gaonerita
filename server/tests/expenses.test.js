import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run, get } from '../db.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

function mockNow(dateStr, hh, mm) {
  vi.setSystemTime(new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`));
  return () => vi.useRealTimers();
}

describe('Registro de gastos', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza crear un gasto sin autenticación', async () => {
    const res = await request(app).post('/api/expenses').send({ category: 'renta', amount: 5000, date: '2026-07-01' });
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin cree un gasto', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${login.body.token}`).send({ category: 'renta', amount: 5000, date: '2026-07-01' });
    expect(res.status).toBe(403);
  });

  it('crea un gasto válido', async () => {
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({
      category: 'renta', description: 'Renta de julio', amount: 8000, date: '2026-07-01', payment_method: 'transferencia'
    });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('renta');
    expect(res.body.amount).toBe(8000);
  });

  it('rechaza una categoría inválida', async () => {
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'inventado', amount: 100, date: '2026-07-01' });
    expect(res.status).toBe(400);
  });

  it('rechaza un monto negativo o cero', async () => {
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'otro', amount: 0, date: '2026-07-01' });
    expect(res.status).toBe(400);
  });

  it('rechaza una fecha con formato inválido', async () => {
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'otro', amount: 100, date: '07/01/2026' });
    expect(res.status).toBe(400);
  });

  it('permite al admin listar y filtrar gastos por rango de fechas y categoría', async () => {
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 8000, date: '2026-07-01' });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'insumos', amount: 1500, date: '2026-07-05' });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'insumos', amount: 300, date: '2026-08-01' });

    const all = await request(app).get('/api/expenses').set('Authorization', `Bearer ${token}`);
    expect(all.body.length).toBe(3);

    const julyOnly = await request(app).get('/api/expenses?from=2026-07-01&to=2026-07-31').set('Authorization', `Bearer ${token}`);
    expect(julyOnly.body.length).toBe(2);

    const insumosOnly = await request(app).get('/api/expenses?category=insumos').set('Authorization', `Bearer ${token}`);
    expect(insumosOnly.body.length).toBe(2);
  });

  it('permite al socio ver la lista de gastos (solo lectura)', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });

  it('rechaza que el socio cree un gasto', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${login.body.token}`).send({ category: 'renta', amount: 100, date: '2026-07-01' });
    expect(res.status).toBe(403);
  });

  it('permite editar un gasto existente', async () => {
    const created = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 8000, date: '2026-07-01' });
    const res = await request(app).put(`/api/expenses/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({ amount: 8500 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(8500);
  });

  it('devuelve 404 al editar un gasto inexistente', async () => {
    const res = await request(app).put('/api/expenses/9999').set('Authorization', `Bearer ${token}`).send({ amount: 100 });
    expect(res.status).toBe(404);
  });

  it('permite eliminar un gasto', async () => {
    const created = await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 8000, date: '2026-07-01' });
    const del = await request(app).delete(`/api/expenses/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const row = get('SELECT id FROM expenses WHERE id = ?', [created.body.id]);
    expect(row).toBeNull();
  });
});

describe('Resumen de gastos por periodo', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });
  afterEach(() => vi.useRealTimers());

  it('agrupa los gastos del periodo por categoría', async () => {
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 8000, date: '2026-07-05' });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'insumos', amount: 1000, date: '2026-07-05' });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'insumos', amount: 500, date: '2026-07-05' });
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 9000, date: '2026-06-05' });

    const restore = mockNow('2026-07-05', 12, 0);
    const res = await request(app).get('/api/expenses/summary?period=day&date=2026-07-05').set('Authorization', `Bearer ${token}`);
    restore();
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(9500);
    const insumos = res.body.byCategory.find(c => c.category === 'insumos');
    expect(insumos.total).toBe(1500);
    expect(insumos.count).toBe(2);
  });
});
