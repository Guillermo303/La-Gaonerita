import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run } from '../db.js';

async function registerAndLogin(app, overrides = {}) {
  const email = overrides.email || `user${Math.random()}@test.com`;
  await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'secreto123', ...overrides });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'secreto123' });
  return res.body.token;
}

function seedMenuItem() {
  const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
  const item = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40]);
  return item.lastInsertRowid;
}

describe('GET /api/orders/kitchen/active', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/orders/kitchen/active');
    expect(res.status).toBe(401);
  });

  it('rejects a cliente role', async () => {
    const token = await registerAndLogin(app);
    const res = await request(app).get('/api/orders/kitchen/active').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows the admin account', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
    const res = await request(app).get('/api/orders/kitchen/active').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/orders', () => {
  let app, token, menuItemId;
  beforeEach(async () => {
    app = await freshApp();
    menuItemId = seedMenuItem();
    token = await registerAndLogin(app);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/orders').send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 2 }]
    });
    expect(res.status).toBe(401);
  });

  it('creates an order and computes the total from the menu price', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 2 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(80);
    expect(res.body.status).toBe('pendiente');
    expect(res.body.items).toHaveLength(1);
  });

  it('rejects an order with no items', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: []
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/orders/:id/status', () => {
  let app, clienteToken, adminToken, orderId;
  beforeEach(async () => {
    app = await freshApp();
    const menuItemId = seedMenuItem();
    clienteToken = await registerAndLogin(app);
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
    adminToken = login.body.token;
    const order = await request(app).post('/api/orders').set('Authorization', `Bearer ${clienteToken}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 1 }]
    });
    orderId = order.body.id;
  });

  it('rejects a cliente trying to advance the order status', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${clienteToken}`).send({ status: 'preparando' });
    expect(res.status).toBe(403);
  });

  it('lets an admin advance the order status', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'preparando' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('preparando');
  });

  it('rejects an invalid status value', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'volando' });
    expect(res.status).toBe(400);
  });
});
