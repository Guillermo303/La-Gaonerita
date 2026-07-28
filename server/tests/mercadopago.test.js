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

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

async function seedMenuItem() {
  const cat = await run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
  const item = await run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40]);
  return item.lastInsertRowid;
}

describe('POST /api/orders/:id/mercadopago-link', () => {
  let app, token, menuItemId;
  beforeEach(async () => {
    app = await freshApp();
    token = await registerAndLogin(app);
    menuItemId = await seedMenuItem();
  });

  async function createOrder(authToken) {
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${authToken}`)
      .send({ customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 1 }] });
    return res.body.id;
  }

  it('rechaza sin autenticación', async () => {
    const orderId = await createOrder(token);
    const res = await request(app).post(`/api/orders/${orderId}/mercadopago-link`);
    expect(res.status).toBe(401);
  });

  it('genera un link en modo demostración cuando no hay Access Token configurado', async () => {
    const orderId = await createOrder(token);
    const res = await request(app).post(`/api/orders/${orderId}/mercadopago-link`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.demo).toBe(true);
    expect(res.body.link).toContain(String(orderId));
  });

  it('reutiliza el mismo link si ya se había generado antes (no crea uno nuevo)', async () => {
    const orderId = await createOrder(token);
    const first = await request(app).post(`/api/orders/${orderId}/mercadopago-link`).set('Authorization', `Bearer ${token}`);
    const second = await request(app).post(`/api/orders/${orderId}/mercadopago-link`).set('Authorization', `Bearer ${token}`);
    expect(second.body.link).toBe(first.body.link);
  });

  it('marca el método de pago como transferencia al generar el link', async () => {
    const orderId = await createOrder(token);
    await request(app).post(`/api/orders/${orderId}/mercadopago-link`).set('Authorization', `Bearer ${token}`);
    const order = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${token}`);
    expect(order.body.payment_method).toBe('transferencia');
  });

  it('rechaza que otro cliente genere el link de una orden que no es suya', async () => {
    const orderId = await createOrder(token);
    const otroToken = await registerAndLogin(app);
    const res = await request(app).post(`/api/orders/${orderId}/mercadopago-link`).set('Authorization', `Bearer ${otroToken}`);
    expect(res.status).toBe(403);
  });

  it('permite a un mesero/admin generar el link de la orden de cualquier cliente', async () => {
    const orderId = await createOrder(token);
    const admin = await adminToken(app);
    const res = await request(app).post(`/api/orders/${orderId}/mercadopago-link`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.demo).toBe(true);
  });
});
