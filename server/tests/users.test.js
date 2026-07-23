import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { get, run } from '../db.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

describe('Búsqueda de cuentas por email', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza la búsqueda sin autenticación', async () => {
    const res = await request(app).get('/api/users/lookup?email=test@test.com');
    expect(res.status).toBe(401);
  });

  it('rechaza la búsqueda a un no-admin', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/users/lookup?email=ana@test.com').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it('devuelve 404 si no existe ninguna cuenta con ese email', async () => {
    const res = await request(app).get('/api/users/lookup?email=noexiste@test.com').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('encuentra una cuenta existente e indica que no tiene historial', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Cliente Prueba', email: 'prueba@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/users/lookup?email=prueba@test.com').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('cliente');
    expect(res.body.hasHistory).toBe(false);
  });

  it('indica que sí tiene historial si ya hizo un pedido', async () => {
    const register = await request(app).post('/api/auth/register').send({ name: 'Cliente Prueba', email: 'prueba@test.com', password: 'secreto123' });
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco', 40]);
    await request(app).post('/api/orders').set('Authorization', `Bearer ${register.body.token}`).send({
      customer_name: 'Cliente Prueba', order_type: 'local', items: [{ menu_item_id: item.lastInsertRowid, quantity: 1 }]
    });
    const res = await request(app).get('/api/users/lookup?email=prueba@test.com').set('Authorization', `Bearer ${token}`);
    expect(res.body.hasHistory).toBe(true);
  });
});

describe('Eliminar cuenta permanentemente', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza eliminar sin autenticación', async () => {
    const res = await request(app).delete('/api/users/999');
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin elimine cuentas', async () => {
    const register = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).delete(`/api/users/${register.body.user.id}`).set('Authorization', `Bearer ${register.body.token}`);
    expect(res.status).toBe(403);
  });

  it('rechaza que el admin se elimine a sí mismo', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete(`/api/users/${me.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('devuelve 404 si la cuenta no existe', async () => {
    const res = await request(app).delete('/api/users/9999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('elimina una cuenta de prueba sin historial y libera el email', async () => {
    const register = await request(app).post('/api/auth/register').send({ name: 'Cliente Prueba', email: 'prueba@test.com', password: 'secreto123' });
    const userId = register.body.user.id;

    const del = await request(app).delete(`/api/users/${userId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(get('SELECT id FROM users WHERE id = ?', [userId])).toBeNull();

    // El mismo email ahora se puede volver a registrar sin conflicto
    const reregister = await request(app).post('/api/auth/register').send({ name: 'Cliente Prueba 2', email: 'prueba@test.com', password: 'secreto123' });
    expect(reregister.status).toBe(201);
  });

  it('rechaza eliminar una cuenta con historial de pedidos', async () => {
    const register = await request(app).post('/api/auth/register').send({ name: 'Cliente Prueba', email: 'prueba@test.com', password: 'secreto123' });
    const userId = register.body.user.id;
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco', 40]);
    await request(app).post('/api/orders').set('Authorization', `Bearer ${register.body.token}`).send({
      customer_name: 'Cliente Prueba', order_type: 'local', items: [{ menu_item_id: item.lastInsertRowid, quantity: 1 }]
    });

    const del = await request(app).delete(`/api/users/${userId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(400);
    expect(get('SELECT id FROM users WHERE id = ?', [userId])).not.toBeNull();
  });

  it('un empleado desactivado sigue bloqueando su email aunque no se elimine', async () => {
    const hired = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({
      name: 'Empleado', email: 'empleado@test.com', password: 'secreto123', role: 'mesero'
    });
    await request(app).put(`/api/employees/${hired.body.id}/status`).set('Authorization', `Bearer ${token}`).send({ active: false });

    const reregister = await request(app).post('/api/auth/register').send({ name: 'Otra Persona', email: 'empleado@test.com', password: 'secreto123' });
    expect(reregister.status).toBe(400);
  });

  it('elimina también su fila de employee_details', async () => {
    const hired = await request(app).post('/api/employees').set('Authorization', `Bearer ${token}`).send({
      name: 'Empleado Prueba', email: 'empleado-prueba@test.com', password: 'secreto123', role: 'mesero'
    });
    const del = await request(app).delete(`/api/users/${hired.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(get('SELECT user_id FROM employee_details WHERE user_id = ?', [hired.body.id])).toBeNull();
  });
});
