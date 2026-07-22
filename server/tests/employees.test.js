import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

describe('POST /api/employees (contratar)', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rejects a non-admin trying to hire someone', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${login.body.token}`).send({
      name: 'Nuevo', email: 'nuevo@test.com', password: 'secreto123', role: 'mesero'
    });
    expect(res.status).toBe(403);
  });

  it('hires a new employee with full HR details', async () => {
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({
      name: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'secreto123',
      phone: '5512345678',
      role: 'mesero',
      puesto: 'Mesero de fin de semana',
      salario: 1500,
      periodo_pago: 'semanal',
      prestaciones: ['IMSS', 'Aguinaldo'],
      dias_laborales: ['Viernes', 'Sábado', 'Domingo']
    });
    expect(res.status).toBe(201);
    expect(res.body.puesto).toBe('Mesero de fin de semana');
    expect(res.body.salario).toBe(1500);
    expect(res.body.prestaciones).toEqual(['IMSS', 'Aguinaldo']);
    expect(res.body.dias_laborales).toEqual(['Viernes', 'Sábado', 'Domingo']);
    expect(res.body.fecha_contratacion).toBeTruthy();
    expect(res.body.active).toBe(1);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({ name: 'A', email: 'dup@test.com', password: 'secreto123', role: 'mesero' });
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({ name: 'B', email: 'dup@test.com', password: 'secreto123', role: 'mesero' });
    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({ name: 'A', email: 'short@test.com', password: '123', role: 'mesero' });
    expect(res.status).toBe(400);
  });

  it('defaults an invalid role to mesero', async () => {
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({ name: 'A', email: 'rol@test.com', password: 'secreto123', role: 'cliente' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('mesero');
  });
});

describe('PUT /api/employees/:id (editar datos de RH)', () => {
  let app, token, employeeId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
    const hire = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({
      name: 'Juan', email: 'juan@test.com', password: 'secreto123', role: 'cocina', puesto: 'Cocinero', salario: 1000
    });
    employeeId = hire.body.id;
  });

  it('updates salary, position and benefits', async () => {
    const res = await request(app).put(`/api/employees/${employeeId}`).set('Authorization', `Bearer ${token}`).send({
      salario: 1800, puesto: 'Cocinero Jefe', prestaciones: ['IMSS', 'Vales de Despensa'], dias_laborales: ['Lunes', 'Martes', 'Miércoles']
    });
    expect(res.status).toBe(200);
    expect(res.body.salario).toBe(1800);
    expect(res.body.puesto).toBe('Cocinero Jefe');
    expect(res.body.prestaciones).toEqual(['IMSS', 'Vales de Despensa']);
    expect(res.body.dias_laborales).toEqual(['Lunes', 'Martes', 'Miércoles']);
  });

  it('rejects an invalid periodo_pago', async () => {
    const res = await request(app).put(`/api/employees/${employeeId}`).set('Authorization', `Bearer ${token}`).send({ periodo_pago: 'anual' });
    expect(res.status).toBe(400);
  });

  it('rejects a non-admin editing employee data', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'juan@test.com', password: 'secreto123' });
    const res = await request(app).put(`/api/employees/${employeeId}`).set('Authorization', `Bearer ${login.body.token}`).send({ salario: 99999 });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a nonexistent employee', async () => {
    const res = await request(app).put('/api/employees/99999').set('Authorization', `Bearer ${token}`).send({ salario: 100 });
    expect(res.status).toBe(404);
  });
});
