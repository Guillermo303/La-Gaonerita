import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { get } from '../db.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

describe('Registro de activos', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza crear un activo sin autenticación', async () => {
    const res = await request(app).post('/api/assets').send({ name: 'Refrigerador' });
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin cree un activo', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'Refrigerador' });
    expect(res.status).toBe(403);
  });

  it('crea un activo con valores por defecto', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Refrigerador Industrial' });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('otro');
    expect(res.body.quantity).toBe(1);
    expect(res.body.condition).toBe('bueno');
  });

  it('crea un activo con todos los campos', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({
      name: 'Sillas de comedor', category: 'mobiliario', quantity: 20, purchase_price: 350, purchase_date: '2024-03-01', condition: 'bueno', location: 'Salón', notes: 'Madera'
    });
    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(20);
    expect(res.body.purchase_price).toBe(350);
  });

  it('rechaza sin nombre', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ category: 'cocina' });
    expect(res.status).toBe(400);
  });

  it('rechaza una categoría inválida', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'X', category: 'inventado' });
    expect(res.status).toBe(400);
  });

  it('rechaza un estado inválido', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'X', condition: 'inventado' });
    expect(res.status).toBe(400);
  });

  it('rechaza una cantidad de cero o negativa', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'X', quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('rechaza un precio de compra negativo', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'X', purchase_price: -10 });
    expect(res.status).toBe(400);
  });

  it('lista y filtra activos por categoría', async () => {
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Refrigerador', category: 'cocina' });
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Estufa', category: 'cocina' });
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Mesas', category: 'mobiliario' });

    const all = await request(app).get('/api/assets').set('Authorization', `Bearer ${token}`);
    expect(all.body.length).toBe(3);

    const cocina = await request(app).get('/api/assets?category=cocina').set('Authorization', `Bearer ${token}`);
    expect(cocina.body.length).toBe(2);
  });

  it('permite al socio ver el listado de activos (solo lectura)', async () => {
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Refrigerador' });
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/assets').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });

  it('rechaza que el socio cree un activo', async () => {
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/assets').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'Refrigerador' });
    expect(res.status).toBe(403);
  });

  it('permite editar un activo existente', async () => {
    const created = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Freidora', condition: 'bueno' });
    const res = await request(app).put(`/api/assets/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({ condition: 'malo', notes: 'Requiere mantenimiento' });
    expect(res.status).toBe(200);
    expect(res.body.condition).toBe('malo');
    expect(res.body.notes).toBe('Requiere mantenimiento');
    expect(res.body.name).toBe('Freidora');
  });

  it('devuelve 404 al editar un activo inexistente', async () => {
    const res = await request(app).put('/api/assets/9999').set('Authorization', `Bearer ${token}`).send({ condition: 'malo' });
    expect(res.status).toBe(404);
  });

  it('permite eliminar un activo', async () => {
    const created = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'TV' });
    const del = await request(app).delete(`/api/assets/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const row = await get('SELECT id FROM assets WHERE id = ?', [created.body.id]);
    expect(row).toBeNull();
  });

  it('devuelve 404 al eliminar un activo inexistente', async () => {
    const res = await request(app).delete('/api/assets/9999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Resumen de activos', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('calcula el valor total y el conteo agrupado por categoría', async () => {
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Refrigerador', category: 'cocina', quantity: 1, purchase_price: 12000 });
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Sillas', category: 'mobiliario', quantity: 20, purchase_price: 350 });

    const res = await request(app).get('/api/assets/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalValue).toBe(12000 + 20 * 350);
    expect(res.body.totalItems).toBe(21);
    expect(res.body.assetCount).toBe(2);
    const mobiliario = res.body.byCategory.find(c => c.category === 'mobiliario');
    expect(mobiliario.count).toBe(20);
    expect(mobiliario.value).toBe(7000);
  });

  it('agrupa por estado de condición', async () => {
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Refrigerador', condition: 'bueno' });
    await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({ name: 'Freidora', condition: 'malo' });
    const res = await request(app).get('/api/assets/summary').set('Authorization', `Bearer ${token}`);
    const malo = res.body.byCondition.find(c => c.condition === 'malo');
    expect(malo.count).toBe(1);
  });
});
