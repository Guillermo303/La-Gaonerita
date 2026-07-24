import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run } from '../db.js';

describe('GET /api/menu', () => {
  let app;
  beforeEach(async () => {
    app = await freshApp();
    const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    await run('INSERT INTO menu_items (category_id, name, price, available) VALUES (?, ?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40, 1]);
    await run('INSERT INTO menu_items (category_id, name, price, available) VALUES (?, ?, ?, ?)', [cat.lastInsertRowid, 'Oculto', 40, 0]);
  });

  it('is public and only returns available items', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    const names = res.body.flatMap(c => c.items.map(i => i.name));
    expect(names).toContain('Taco de asada');
    expect(names).not.toContain('Oculto');
  });

  it('esconde un item marcado como agotado (stock 0) aunque esté disponible', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
    const all = await request(app).get('/api/menu/all').set('Authorization', `Bearer ${login.body.token}`);
    const item = all.body.flatMap(c => c.items).find(i => i.name === 'Taco de asada');
    await request(app).put(`/api/menu/items/${item.id}/stock`).set('Authorization', `Bearer ${login.body.token}`).send({ stock: 0 });

    const res = await request(app).get('/api/menu');
    const names = res.body.flatMap(c => c.items.map(i => i.name));
    expect(names).not.toContain('Taco de asada');
  });
});

describe('Marcar un platillo como agotado hoy', () => {
  let app, itemId;
  beforeEach(async () => {
    app = await freshApp();
    const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = await run('INSERT INTO menu_items (category_id, name, price, stock, max_stock) VALUES (?, ?, ?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40, 20, 20]);
    itemId = item.lastInsertRowid;
  });

  async function loginAs(role) {
    const email = `${role}${Math.random()}@test.com`;
    if (role === 'cliente' || role === 'mesero') {
      await request(app).post('/api/auth/register').send({ name: 'Trabajador', email, password: 'secreto123', role });
    } else {
      const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
      await request(app).post('/api/employees').set('Authorization', `Bearer ${adminLogin.body.token}`).send({ name: 'Trabajador', email, password: 'secreto123', role });
    }
    const login = await request(app).post('/api/auth/login').send({ email, password: 'secreto123' });
    return login.body.token;
  }

  it('permite a un mesero marcar un platillo como agotado', async () => {
    const token = await loginAs('mesero');
    const res = await request(app).put(`/api/menu/items/${itemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: 0 });
    expect(res.status).toBe(200);
  });

  it('permite a cocina marcar un platillo como agotado', async () => {
    const token = await loginAs('cocina');
    const res = await request(app).put(`/api/menu/items/${itemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: 0 });
    expect(res.status).toBe(200);
  });

  it('rechaza a un cliente', async () => {
    const token = await loginAs('cliente');
    const res = await request(app).put(`/api/menu/items/${itemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: 0 });
    expect(res.status).toBe(403);
  });

  it('permite a mesero y cocina ver el menú completo (GET /menu/all)', async () => {
    const mesero = await loginAs('mesero');
    const cocina = await loginAs('cocina');
    const resMesero = await request(app).get('/api/menu/all').set('Authorization', `Bearer ${mesero}`);
    const resCocina = await request(app).get('/api/menu/all').set('Authorization', `Bearer ${cocina}`);
    expect(resMesero.status).toBe(200);
    expect(resCocina.status).toBe(200);
  });

  it('el platillo vuelve a aparecer al restaurar el stock', async () => {
    const token = await loginAs('mesero');
    await request(app).put(`/api/menu/items/${itemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: 0 });
    let res = await request(app).get('/api/menu');
    expect(res.body.flatMap(c => c.items.map(i => i.name))).not.toContain('Taco de asada');

    await request(app).put(`/api/menu/items/${itemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: 20 });
    res = await request(app).get('/api/menu');
    expect(res.body.flatMap(c => c.items.map(i => i.name))).toContain('Taco de asada');
  });
});

describe('POST /api/menu/items', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('rejects a non-admin user', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const res = await request(app).post('/api/menu/items').set('Authorization', `Bearer ${login.body.token}`).send({
      category_id: cat.lastInsertRowid, name: 'Nuevo', price: 10
    });
    expect(res.status).toBe(403);
  });

  it('allows the admin account', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
    const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const res = await request(app).post('/api/menu/items').set('Authorization', `Bearer ${login.body.token}`).send({
      category_id: cat.lastInsertRowid, name: 'Nuevo', price: 10
    });
    expect(res.status).toBe(201);
  });
});
