import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run } from '../db.js';

describe('GET /api/menu', () => {
  let app;
  beforeEach(async () => {
    app = await freshApp();
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    run('INSERT INTO menu_items (category_id, name, price, available) VALUES (?, ?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40, 1]);
    run('INSERT INTO menu_items (category_id, name, price, available) VALUES (?, ?, ?, ?)', [cat.lastInsertRowid, 'Oculto', 40, 0]);
  });

  it('is public and only returns available items', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    const names = res.body.flatMap(c => c.items.map(i => i.name));
    expect(names).toContain('Taco de asada');
    expect(names).not.toContain('Oculto');
  });
});

describe('POST /api/menu/items', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('rejects a non-admin user', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const res = await request(app).post('/api/menu/items').set('Authorization', `Bearer ${login.body.token}`).send({
      category_id: cat.lastInsertRowid, name: 'Nuevo', price: 10
    });
    expect(res.status).toBe(403);
  });

  it('allows the admin account', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const res = await request(app).post('/api/menu/items').set('Authorization', `Bearer ${login.body.token}`).send({
      category_id: cat.lastInsertRowid, name: 'Nuevo', price: 10
    });
    expect(res.status).toBe(201);
  });
});
