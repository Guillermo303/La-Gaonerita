import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run, get } from '../db.js';
import { resetStockIfNewDay, decrementStock } from '../inventory.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

describe('Creación de productos con inventario', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('usa 20 unidades por defecto si no se especifica capacidad', async () => {
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const res = await request(app).post('/api/menu/items').set('Authorization', `Bearer ${token}`).send({
      category_id: cat.lastInsertRowid, name: 'Taco de asada', price: 40
    });
    expect(res.status).toBe(201);
    expect(res.body.stock).toBe(20);
    expect(res.body.max_stock).toBe(20);
  });

  it('respeta una capacidad personalizada al crear el producto', async () => {
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Bebidas']);
    const res = await request(app).post('/api/menu/items').set('Authorization', `Bearer ${token}`).send({
      category_id: cat.lastInsertRowid, name: 'Agua de Horchata', price: 25, max_stock: 40
    });
    expect(res.status).toBe(201);
    expect(res.body.stock).toBe(40);
    expect(res.body.max_stock).toBe(40);
  });
});

describe('Descuento automático de inventario al crear pedidos', () => {
  let app, token, menuItemId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price, stock, max_stock) VALUES (?, ?, ?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40, 20, 20]);
    menuItemId = item.lastInsertRowid;
  });

  it('descuenta stock en un pedido local', async () => {
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 3 }]
    });
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(17);
  });

  it('descuenta stock en un pedido a domicilio', async () => {
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'domicilio', customer_address: 'Calle Falsa 123', items: [{ menu_item_id: menuItemId, quantity: 5 }]
    });
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(15);
  });

  it('acumula el descuento entre varios pedidos', async () => {
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 8 }]
    });
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Beto', order_type: 'domicilio', customer_address: 'X', items: [{ menu_item_id: menuItemId, quantity: 8 }]
    });
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(4);
  });

  it('no baja de cero aunque se pida más de lo que queda', async () => {
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: menuItemId, quantity: 999 }]
    });
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(0);
  });
});

describe('Administración manual del inventario', () => {
  let app, token, menuItemId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price, stock, max_stock) VALUES (?, ?, ?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40, 20, 20]);
    menuItemId = item.lastInsertRowid;
  });

  it('permite al admin aumentar la capacidad máxima', async () => {
    const res = await request(app).put(`/api/menu/items/${menuItemId}`).set('Authorization', `Bearer ${token}`).send({ max_stock: 50 });
    expect(res.status).toBe(200);
    const item = get('SELECT max_stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.max_stock).toBe(50);
  });

  it('permite al admin ajustar el stock actual manualmente', async () => {
    const res = await request(app).put(`/api/menu/items/${menuItemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: 7 });
    expect(res.status).toBe(200);
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(7);
  });

  it('rechaza un ajuste de stock con valor negativo', async () => {
    const res = await request(app).put(`/api/menu/items/${menuItemId}/stock`).set('Authorization', `Bearer ${token}`).send({ stock: -5 });
    expect(res.status).toBe(400);
  });

  it('rechaza que un no-admin ajuste el inventario', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).put(`/api/menu/items/${menuItemId}/stock`).set('Authorization', `Bearer ${login.body.token}`).send({ stock: 100 });
    expect(res.status).toBe(403);
  });
});

describe('Reinicio diario del inventario', () => {
  let app, menuItemId;
  beforeEach(async () => {
    app = await freshApp();
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price, stock, max_stock) VALUES (?, ?, ?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40, 3, 20]);
    menuItemId = item.lastInsertRowid;
  });

  it('repone el stock a la capacidad máxima la primera vez que corre en un día nuevo', () => {
    const didReset = resetStockIfNewDay();
    expect(didReset).toBe(true);
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(20);
  });

  it('no vuelve a reponer si ya se ejecutó hoy', () => {
    resetStockIfNewDay();
    decrementStock(menuItemId, 5);
    const second = resetStockIfNewDay();
    expect(second).toBe(false);
    const item = get('SELECT stock FROM menu_items WHERE id = ?', [menuItemId]);
    expect(item.stock).toBe(15);
  });
});
