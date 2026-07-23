import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run, get } from '../db.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

describe('Gestión de socios', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza crear un socio sin autenticación', async () => {
    const res = await request(app).post('/api/socios').send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin cree un socio', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/socios').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    expect(res.status).toBe(403);
  });

  it('permite al admin crear un socio', async () => {
    const res = await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Doña Lupe', email: 'lupe@test.com', password: 'secreto123', phone: '5511112222' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('lupe@test.com');
    const row = await get("SELECT role FROM users WHERE email = 'lupe@test.com'");
    expect(row.role).toBe('socio');
  });

  it('rechaza contraseñas cortas', async () => {
    const res = await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rechaza un email duplicado', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Otro', email: 'socio@test.com', password: 'secreto123' });
    expect(res.status).toBe(400);
  });

  it('lista los socios existentes', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/socios').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Socio');
  });

  it('el socio puede iniciar sesión y el token refleja su rol', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('socio');
  });

  it('permite desactivar a un socio y le revoca la sesión de inmediato', async () => {
    const created = await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const socioToken = login.body.token;

    const before = await request(app).get('/api/reports/sales').set('Authorization', `Bearer ${socioToken}`);
    expect(before.status).toBe(200);

    await request(app).put(`/api/socios/${created.body.id}/status`).set('Authorization', `Bearer ${token}`).send({ active: false });

    const after = await request(app).get('/api/reports/sales').set('Authorization', `Bearer ${socioToken}`);
    expect(after.status).toBe(401);
  });

  it('devuelve 404 al desactivar un socio inexistente', async () => {
    const res = await request(app).put('/api/socios/9999/status').set('Authorization', `Bearer ${token}`).send({ active: false });
    expect(res.status).toBe(404);
  });
});

describe('Acceso de socios a reportes de solo lectura', () => {
  let app, adminTok, socioTok;
  beforeEach(async () => {
    app = await freshApp();
    adminTok = await adminToken(app);
    await request(app).post('/api/socios').set('Authorization', `Bearer ${adminTok}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    socioTok = login.body.token;
  });

  it('permite al socio ver el reporte de ventas', async () => {
    const res = await request(app).get('/api/reports/sales?period=day').set('Authorization', `Bearer ${socioTok}`);
    expect(res.status).toBe(200);
  });

  it('permite al socio ver el reporte de salud del negocio', async () => {
    const res = await request(app).get('/api/reports/health?period=day').set('Authorization', `Bearer ${socioTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profitEstimate');
    expect(res.body).toHaveProperty('payrollEstimate');
  });

  it('permite al socio ver la lista de reportes guardados', async () => {
    const res = await request(app).get('/api/reports/saved').set('Authorization', `Bearer ${socioTok}`);
    expect(res.status).toBe(200);
  });

  it('rechaza que el socio guarde un reporte (solo lectura)', async () => {
    const res = await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${socioTok}`).send({ period: 'day' });
    expect(res.status).toBe(403);
  });

  it('rechaza que el socio elimine un reporte guardado', async () => {
    const save = await request(app).post('/api/reports/sales/save').set('Authorization', `Bearer ${adminTok}`).send({ period: 'day' });
    const res = await request(app).delete(`/api/reports/saved/${save.body.id}`).set('Authorization', `Bearer ${socioTok}`);
    expect(res.status).toBe(403);
  });

  it('rechaza que el socio acceda a la gestión de empleados', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${socioTok}`);
    expect(res.status).toBe(403);
  });

  it('rechaza que el socio cree otros socios', async () => {
    const res = await request(app).post('/api/socios').set('Authorization', `Bearer ${socioTok}`).send({ name: 'Otro', email: 'otro@test.com', password: 'secreto123' });
    expect(res.status).toBe(403);
  });
});

describe('Cálculo de salud del negocio (ingresos vs. nómina)', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('calcula la nómina estimada prorrateada a un día para un empleado semanal', async () => {
    await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({
      name: 'Mesero', email: 'mesero@test.com', password: 'secreto123', role: 'mesero', salario: 700, periodo_pago: 'semanal'
    });
    const res = await request(app).get('/api/reports/health?period=day').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activeEmployees).toBe(1);
    expect(res.body.payrollEstimate).toBeCloseTo(100, 5);
    expect(res.body.profitEstimate).toBeCloseTo(-100, 5);
  });

  it('no cuenta empleados dados de baja en la nómina estimada', async () => {
    const hired = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({
      name: 'Mesero', email: 'mesero@test.com', password: 'secreto123', role: 'mesero', salario: 700, periodo_pago: 'semanal'
    });
    await request(app).put(`/api/employees/${hired.body.id}/status`).set('Authorization', `Bearer ${token}`).send({ active: false });
    const res = await request(app).get('/api/reports/health?period=day').set('Authorization', `Bearer ${token}`);
    expect(res.body.activeEmployees).toBe(0);
    expect(res.body.payrollEstimate).toBe(0);
  });

  it('no cuenta socios como parte de la nómina', async () => {
    const socio = await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    void socio;
    const res = await request(app).get('/api/reports/health?period=day').set('Authorization', `Bearer ${token}`);
    expect(res.body.activeEmployees).toBe(0);
  });

  it('resta los gastos registrados del periodo de la utilidad estimada', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 500, date: today });
    const res = await request(app).get('/api/reports/health?period=day').set('Authorization', `Bearer ${token}`);
    expect(res.body.expensesTotal).toBe(500);
    expect(res.body.profitEstimate).toBeCloseTo(-500, 5);
  });

  it('no cuenta gastos fuera del periodo consultado', async () => {
    await request(app).post('/api/expenses').set('Authorization', `Bearer ${token}`).send({ category: 'renta', amount: 500, date: '2020-01-01' });
    const res = await request(app).get('/api/reports/health?period=day').set('Authorization', `Bearer ${token}`);
    expect(res.body.expensesTotal).toBe(0);
  });
});
