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

async function seedMenuItem() {
  const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
  const item = await run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40]);
  return item.lastInsertRowid;
}

async function createCompletedOrder({ userId, menuItemId, quantity, dateStr }) {
  const timestamp = `${dateStr} 14:00:00`;
  const order = await run(
    "INSERT INTO orders (user_id, customer_name, order_type, total, status, payment_status, created_at) VALUES (?, ?, 'local', ?, 'completado', 'pagado', ?)",
    [userId, 'Cliente', quantity * 40, timestamp]
  );
  await run('INSERT INTO order_items (order_id, menu_item_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)', [order.lastInsertRowid, menuItemId, 'Taco de asada', quantity, 40]);
  return order.lastInsertRowid;
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
    menuItemId = await seedMenuItem();
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
    const menuItemId = await seedMenuItem();
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

async function seedReadyToServeItem(name = 'Coca-Cola') {
  const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Bebidas']);
  const item = await run('INSERT INTO menu_items (category_id, name, price, ready_to_serve) VALUES (?, ?, ?, 1)', [cat.lastInsertRowid, name, 20]);
  return item.lastInsertRowid;
}

describe('Compra rápida (quick_sale)', () => {
  let app, token, readyItemId, prepItemId;
  beforeEach(async () => {
    app = await freshApp();
    token = await registerAndLogin(app);
    readyItemId = await seedReadyToServeItem();
    prepItemId = await seedMenuItem();
  });

  it('crea la orden directamente como completada cuando todos los productos están listos para servir', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', quick_sale: true, items: [{ menu_item_id: readyItemId, quantity: 2 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('completado');
    expect(res.body.payment_status).toBe('pendiente');
    expect(res.body.total).toBe(40);
  });

  it('permite marcar la compra rápida como ya pagada al crearla', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', quick_sale: true, payment_status: 'pagado', items: [{ menu_item_id: readyItemId, quantity: 1 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe('pagado');
  });

  it('rechaza la compra rápida si algún producto requiere preparación', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', quick_sale: true, items: [{ menu_item_id: prepItemId, quantity: 1 }]
    });
    expect(res.status).toBe(400);
  });

  it('rechaza la compra rápida con productos personalizados sin menu_item_id', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', quick_sale: true, items: [{ name: 'Extra', price: 10, quantity: 1 }]
    });
    expect(res.status).toBe(400);
  });

  it('no aparece en la cola de cocina (kitchen/active)', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
    const adminTok = login.body.token;
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', quick_sale: true, items: [{ menu_item_id: readyItemId, quantity: 1 }]
    });
    const res = await request(app).get('/api/orders/kitchen/active').set('Authorization', `Bearer ${adminTok}`);
    expect(res.body.length).toBe(0);
  });

  it('una orden normal (sin quick_sale) sigue empezando como pendiente', async () => {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: readyItemId, quantity: 1 }]
    });
    expect(res.body.status).toBe('pendiente');
  });
});

describe('GET /api/orders/recommendations', () => {
  let app, token, userId, tacoId, gringaId;
  beforeEach(async () => {
    app = await freshApp();
    const register = await request(app).post('/api/auth/register').send({ name: 'Cliente Fiel', email: 'fiel@test.com', password: 'secreto123' });
    token = register.body.token;
    userId = register.body.user.id;
    tacoId = await seedMenuItem();
    const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Especialidades']);
    const gringa = await run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Gringa', 50]);
    gringaId = gringa.lastInsertRowid;
  });

  it('rechaza sin autenticación', async () => {
    const res = await request(app).get('/api/orders/recommendations');
    expect(res.status).toBe(401);
  });

  it('no es elegible con menos de 5 días distintos de compra', async () => {
    for (let i = 1; i <= 4; i++) {
      await createCompletedOrder({ userId, menuItemId: tacoId, quantity: 1, dateStr: `2026-07-0${i}` });
    }
    const res = await request(app).get('/api/orders/recommendations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(false);
    expect(res.body.items).toEqual([]);
  });

  it('es elegible con 5 compras en días distintos y recomienda lo que más pide', async () => {
    for (let i = 1; i <= 5; i++) {
      await createCompletedOrder({ userId, menuItemId: tacoId, quantity: 3, dateStr: `2026-07-0${i}` });
    }
    await createCompletedOrder({ userId, menuItemId: gringaId, quantity: 1, dateStr: '2026-07-05' });

    const res = await request(app).get('/api/orders/recommendations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(true);
    expect(res.body.items[0].name).toBe('Taco de asada');
  });

  it('no cuenta varios pedidos el mismo día como días distintos', async () => {
    for (let i = 0; i < 5; i++) {
      await createCompletedOrder({ userId, menuItemId: tacoId, quantity: 1, dateStr: '2026-07-01' });
    }
    const res = await request(app).get('/api/orders/recommendations').set('Authorization', `Bearer ${token}`);
    expect(res.body.eligible).toBe(false);
  });

  it('no recomienda productos que ya no están disponibles', async () => {
    for (let i = 1; i <= 5; i++) {
      await createCompletedOrder({ userId, menuItemId: tacoId, quantity: 1, dateStr: `2026-07-0${i}` });
    }
    await run('UPDATE menu_items SET available = 0 WHERE id = ?', [tacoId]);
    const res = await request(app).get('/api/orders/recommendations').set('Authorization', `Bearer ${token}`);
    expect(res.body.items.find(i => i.id === tacoId)).toBeUndefined();
  });
});
