import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run, get, query } from '../db.js';
import { processReservations } from '../reservations.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

function mockNow(dateStr, hh, mm) {
  const real = Date;
  const fixed = new real(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  vi.setSystemTime(fixed);
  return () => vi.useRealTimers();
}

describe('Creación de reservaciones', () => {
  let app;
  beforeEach(async () => {
    app = await freshApp();
  });
  afterEach(() => vi.useRealTimers());

  it('crea una reservación y asigna una mesa automáticamente', async () => {
    const restore = mockNow('2026-08-01', 10, 0);
    const res = await request(app).post('/api/reservations').send({
      customer_name: 'Ana', customer_phone: '5512345678', party_size: 2, date: '2026-08-01', time: '14:00'
    });
    expect(res.status).toBe(201);
    expect(res.body.mesa).toBeTruthy();
    restore();
  });

  it('rechaza si faltan datos requeridos', async () => {
    const res = await request(app).post('/api/reservations').send({ date: '2026-08-01', time: '14:00' });
    expect(res.status).toBe(400);
  });

  it('rechaza horarios fuera del rango de atención', async () => {
    const res = await request(app).post('/api/reservations').send({
      customer_name: 'Ana', customer_phone: '5512345678', date: '2026-08-01', time: '23:30'
    });
    expect(res.status).toBe(400);
  });

  it('rechaza una fecha ya pasada', async () => {
    const restore = mockNow('2026-08-01', 10, 0);
    const res = await request(app).post('/api/reservations').send({
      customer_name: 'Ana', customer_phone: '5512345678', date: '2026-07-01', time: '14:00'
    });
    expect(res.status).toBe(400);
    restore();
  });

  it('no permite reservar todas las mesas en el mismo horario más veces de las que existen', async () => {
    const restore = mockNow('2026-08-01', 10, 0);
    const mesasCount = (await query('SELECT COUNT(*) as count FROM mesas'))[0].count;
    for (let i = 0; i < mesasCount; i++) {
      const r = await request(app).post('/api/reservations').send({
        customer_name: `Cliente ${i}`, customer_phone: '5512345678', party_size: 2, date: '2026-08-01', time: '14:00'
      });
      expect(r.status).toBe(201);
    }
    const overflow = await request(app).post('/api/reservations').send({
      customer_name: 'Sin lugar', customer_phone: '5512345678', party_size: 2, date: '2026-08-01', time: '14:00'
    });
    expect(overflow.status).toBe(409);
    restore();
  });

  it('permite reservar la misma mesa en un horario que no se traslapa', async () => {
    const restore = mockNow('2026-08-01', 10, 0);
    const mesasCount = (await query('SELECT COUNT(*) as count FROM mesas'))[0].count;
    for (let i = 0; i < mesasCount; i++) {
      await request(app).post('/api/reservations').send({
        customer_name: `Cliente ${i}`, customer_phone: '5512345678', party_size: 2, date: '2026-08-01', time: '14:00'
      });
    }
    const later = await request(app).post('/api/reservations').send({
      customer_name: 'Después', customer_phone: '5512345678', party_size: 2, date: '2026-08-01', time: '16:00'
    });
    expect(later.status).toBe(201);
    restore();
  });
});

describe('Acceso a la lista de reservaciones', () => {
  let app;
  beforeEach(async () => {
    app = await freshApp();
  });

  it('rechaza el acceso sin autenticación', async () => {
    const res = await request(app).get('/api/reservations');
    expect(res.status).toBe(401);
  });

  it('permite al admin ver las reservaciones', async () => {
    const restore = mockNow('2026-08-01', 10, 0);
    const token = await adminToken(app);
    await request(app).post('/api/reservations').send({
      customer_name: 'Ana', customer_phone: '5512345678', date: '2026-08-01', time: '14:00'
    });
    const res = await request(app).get('/api/reservations?date=2026-08-01').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    restore();
  });

  it('permite al admin cancelar una reservación', async () => {
    const restore = mockNow('2026-08-01', 10, 0);
    const token = await adminToken(app);
    const created = await request(app).post('/api/reservations').send({
      customer_name: 'Ana', customer_phone: '5512345678', date: '2026-08-01', time: '14:00'
    });
    const id = (await query('SELECT id FROM reservations'))[0].id;
    const res = await request(app).put(`/api/reservations/${id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'cancelada' });
    expect(res.status).toBe(200);
    const row = await get('SELECT status FROM reservations WHERE id = ?', [id]);
    expect(row.status).toBe('cancelada');
    restore();
    void created;
  });
});

describe('Asignación automática de mesas al llegar la hora', () => {
  let app, mesaId;
  beforeEach(async () => {
    app = await freshApp();
    mesaId = (await query('SELECT id FROM mesas ORDER BY sort_order LIMIT 1'))[0].id;
  });
  afterEach(() => vi.useRealTimers());

  it('marca la reservación como ocupada 1 hora antes de la hora reservada', async () => {
    await run('INSERT INTO reservations (mesa_id, customer_name, customer_phone, party_size, date, time) VALUES (?, ?, ?, ?, ?, ?)',
      [mesaId, 'Ana', '5512345678', 2, '2026-08-01', '14:00']);
    const restore = mockNow('2026-08-01', 13, 0);
    await processReservations();
    const row = await get('SELECT status FROM reservations WHERE mesa_id = ?', [mesaId]);
    expect(row.status).toBe('ocupada');
    restore();
  });

  it('no marca ocupada la reservación si aún faltan más de 1h', async () => {
    await run('INSERT INTO reservations (mesa_id, customer_name, customer_phone, party_size, date, time) VALUES (?, ?, ?, ?, ?, ?)',
      [mesaId, 'Ana', '5512345678', 2, '2026-08-01', '14:00']);
    const restore = mockNow('2026-08-01', 12, 0);
    await processReservations();
    const row = await get('SELECT status FROM reservations WHERE mesa_id = ?', [mesaId]);
    expect(row.status).toBe('confirmada');
    restore();
  });

  it('libera la mesa (completada) al terminar la ventana de la reservación', async () => {
    await run("INSERT INTO reservations (mesa_id, customer_name, customer_phone, party_size, date, time, status) VALUES (?, ?, ?, ?, ?, ?, 'ocupada')",
      [mesaId, 'Ana', '5512345678', 2, '2026-08-01', '14:00']);
    const restore = mockNow('2026-08-01', 15, 45);
    await processReservations();
    const row = await get('SELECT status FROM reservations WHERE mesa_id = ?', [mesaId]);
    expect(row.status).toBe('completada');
    restore();
  });

  it('refleja el estado "reservada" en el listado de mesas antes de la ventana de check-in', async () => {
    await run('INSERT INTO reservations (mesa_id, customer_name, customer_phone, party_size, date, time) VALUES (?, ?, ?, ?, ?, ?)',
      [mesaId, 'Ana', '5512345678', 2, '2026-08-01', '14:00']);
    const restore = mockNow('2026-08-01', 10, 0);
    const res = await request(app).get('/api/mesas');
    const mesa = res.body.find(m => m.id === mesaId);
    expect(mesa.state).toBe('reservada');
    expect(mesa.reservation.customer_name).toBe('Ana');
    restore();
  });

  it('refleja el estado "ocupada" en el listado de mesas dentro de la ventana de check-in', async () => {
    await run("INSERT INTO reservations (mesa_id, customer_name, customer_phone, party_size, date, time, status) VALUES (?, ?, ?, ?, ?, ?, 'ocupada')",
      [mesaId, 'Ana', '5512345678', 2, '2026-08-01', '14:00']);
    const restore = mockNow('2026-08-01', 13, 30);
    const res = await request(app).get('/api/mesas');
    const mesa = res.body.find(m => m.id === mesaId);
    expect(mesa.state).toBe('ocupada');
    restore();
  });
});
