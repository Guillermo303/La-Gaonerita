import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

async function registerEmployee(app, role) {
  const email = `${role}${Math.random()}@test.com`;
  const res = await request(app).post('/api/auth/register').send({ name: 'Empleado', email, password: 'secreto123', role });
  return { email, token: res.body.token, id: res.body.user.id };
}

describe('GET /api/employees', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('rejects a non-admin', async () => {
    const mesero = await registerEmployee(app, 'mesero');
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${mesero.token}`);
    expect(res.status).toBe(403);
  });

  it('lists employees for the admin, excluding clientes', async () => {
    await registerEmployee(app, 'mesero');
    await registerEmployee(app, 'cliente');
    const token = await adminToken(app);
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some(u => u.role === 'cliente')).toBe(false);
    expect(res.body.some(u => u.role === 'mesero')).toBe(true);
  });
});

describe('PUT /api/employees/:id/status', () => {
  let app, admin, mesero;
  beforeEach(async () => {
    app = await freshApp();
    admin = { token: await adminToken(app) };
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${admin.token}`);
    admin.id = me.body.id;
    mesero = await registerEmployee(app, 'mesero');
  });

  it('rejects a non-admin trying to deactivate someone', async () => {
    const res = await request(app).put(`/api/employees/${mesero.id}/status`).set('Authorization', `Bearer ${mesero.token}`).send({ active: false });
    expect(res.status).toBe(403);
  });

  it('prevents an admin from deactivating their own account', async () => {
    const res = await request(app).put(`/api/employees/${admin.id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ active: false });
    expect(res.status).toBe(400);
  });

  it('deactivates (despide a) an employee and stamps a termination date', async () => {
    const res = await request(app).put(`/api/employees/${mesero.id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(0);
    expect(res.body.fecha_baja).toBeTruthy();
  });

  it('immediately invalidates an already-issued token when fired (session revocation)', async () => {
    const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${mesero.token}`);
    expect(before.status).toBe(200);

    await request(app).put(`/api/employees/${mesero.id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ active: false });

    const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${mesero.token}`);
    expect(after.status).toBe(401);
  });

  it('prevents a fired employee from logging in again', async () => {
    await request(app).put(`/api/employees/${mesero.id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ active: false });
    const res = await request(app).post('/api/auth/login').send({ email: mesero.email, password: 'secreto123' });
    expect(res.status).toBe(401);
  });

  it('rehiring (reactivating) clears the termination date and issues a working account again', async () => {
    await request(app).put(`/api/employees/${mesero.id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ active: false });
    const rehire = await request(app).put(`/api/employees/${mesero.id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ active: true });
    expect(rehire.body.fecha_baja).toBeNull();
    const login = await request(app).post('/api/auth/login').send({ email: mesero.email, password: 'secreto123' });
    expect(login.status).toBe(200);
  });
});
