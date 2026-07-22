import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';
import { run, get, query } from '../db.js';
import { checkWeeklyReset, decrementSuppliesForOrder } from '../supplies.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

function mockNow(dateStr, hh = 12, mm = 0) {
  vi.setSystemTime(new Date(`${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`));
  return () => vi.useRealTimers();
}

describe('Gestión de insumos', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza crear un insumo sin autenticación', async () => {
    const res = await request(app).post('/api/supplies').send({ name: 'Tortillas', unit: 'pieza' });
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin cree un insumo', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/supplies').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'Tortillas', unit: 'pieza' });
    expect(res.status).toBe(403);
  });

  it('crea un insumo con la cantidad comprada de la semana', async () => {
    const res = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    expect(res.status).toBe(201);
    expect(res.body.purchased).toBe(500);
    expect(res.body.consumed).toBe(0);
    expect(res.body.remaining).toBe(500);
  });

  it('rechaza un nombre de insumo duplicado', async () => {
    await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    const res = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 100 });
    expect(res.status).toBe(400);
  });

  it('permite registrar la compra semanal de un insumo existente', async () => {
    const created = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Carne', unit: 'kg' });
    const res = await request(app).put(`/api/supplies/${created.body.id}/purchase`).set('Authorization', `Bearer ${token}`).send({ purchased: 30 });
    expect(res.status).toBe(200);
    expect(res.body.purchased).toBe(30);
    expect(res.body.remaining).toBe(30);
  });

  it('rechaza una cantidad comprada negativa', async () => {
    const created = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Carne', unit: 'kg' });
    const res = await request(app).put(`/api/supplies/${created.body.id}/purchase`).set('Authorization', `Bearer ${token}`).send({ purchased: -5 });
    expect(res.status).toBe(400);
  });

  it('permite al socio ver el listado de insumos (solo lectura)', async () => {
    await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/supplies').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('rechaza que el socio registre una compra', async () => {
    const created = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza' });
    await request(app).post('/api/socios').set('Authorization', `Bearer ${token}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).put(`/api/supplies/${created.body.id}/purchase`).set('Authorization', `Bearer ${login.body.token}`).send({ purchased: 100 });
    expect(res.status).toBe(403);
  });

  it('permite eliminar un insumo', async () => {
    const created = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza' });
    const del = await request(app).delete(`/api/supplies/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const row = get('SELECT id FROM supply_items WHERE id = ?', [created.body.id]);
    expect(row).toBeNull();
  });
});

describe('Recetas: vínculo entre platillos e insumos', () => {
  let app, token, menuItemId, supplyId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40]);
    menuItemId = item.lastInsertRowid;
    const supply = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    supplyId = supply.body.id;
  });

  it('crea un vínculo receta con cantidad por unidad', async () => {
    const res = await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: menuItemId, supply_item_id: supplyId, quantity_per_unit: 2 });
    expect(res.status).toBe(201);
    expect(res.body.quantity_per_unit).toBe(2);
  });

  it('usa 1 como cantidad por defecto si no se especifica', async () => {
    const res = await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: menuItemId, supply_item_id: supplyId });
    expect(res.body.quantity_per_unit).toBe(1);
  });

  it('actualiza la cantidad si ya existe el vínculo (no duplica)', async () => {
    await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: menuItemId, supply_item_id: supplyId, quantity_per_unit: 2 });
    await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: menuItemId, supply_item_id: supplyId, quantity_per_unit: 3 });
    const links = query('SELECT * FROM menu_item_supplies WHERE menu_item_id = ? AND supply_item_id = ?', [menuItemId, supplyId]);
    expect(links.length).toBe(1);
    expect(links[0].quantity_per_unit).toBe(3);
  });

  it('rechaza un producto o insumo inexistente', async () => {
    const res = await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: 9999, supply_item_id: supplyId });
    expect(res.status).toBe(404);
  });

  it('elimina un vínculo receta', async () => {
    const created = await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: menuItemId, supply_item_id: supplyId });
    const del = await request(app).delete(`/api/supplies/recipes/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const links = query('SELECT * FROM menu_item_supplies WHERE id = ?', [created.body.id]);
    expect(links.length).toBe(0);
  });
});

describe('Descuento automático de insumos al crear pedidos', () => {
  let app, token, tacoId, tortillaId, carneId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40]);
    tacoId = item.lastInsertRowid;

    const tortilla = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    tortillaId = tortilla.body.id;
    const carne = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Carne', unit: 'kg', purchased: 30 });
    carneId = carne.body.id;

    await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: tacoId, supply_item_id: tortillaId, quantity_per_unit: 2 });
    await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: tacoId, supply_item_id: carneId, quantity_per_unit: 0.08 });
  });

  it('descuenta los insumos vinculados según la cantidad ordenada', async () => {
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: tacoId, quantity: 5 }]
    });
    const tortilla = get('SELECT * FROM supply_items WHERE id = ?', [tortillaId]);
    const carne = get('SELECT * FROM supply_items WHERE id = ?', [carneId]);
    expect(tortilla.consumed).toBe(10);
    expect(carne.consumed).toBeCloseTo(0.4, 5);
  });

  it('acumula el consumo entre varios pedidos', async () => {
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: tacoId, quantity: 3 }]
    });
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Beto', order_type: 'domicilio', customer_address: 'X', items: [{ menu_item_id: tacoId, quantity: 2 }]
    });
    const tortilla = get('SELECT * FROM supply_items WHERE id = ?', [tortillaId]);
    expect(tortilla.consumed).toBe(10);
    const res = await request(app).get('/api/supplies').set('Authorization', `Bearer ${token}`);
    const tortillaRow = res.body.find(s => s.id === tortillaId);
    expect(tortillaRow.remaining).toBe(490);
  });

  it('no descuenta insumos sin receta vinculada al producto', async () => {
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Bebidas']);
    const refresco = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Coca-Cola', 20]);
    await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      customer_name: 'Ana', order_type: 'local', items: [{ menu_item_id: refresco.lastInsertRowid, quantity: 4 }]
    });
    const tortilla = get('SELECT * FROM supply_items WHERE id = ?', [tortillaId]);
    expect(tortilla.consumed).toBe(0);
  });
});

describe('Recuento semanal de insumos', () => {
  let app, token, supplyId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });
  afterEach(() => vi.useRealTimers());

  it('archiva la semana anterior y reinicia comprado/consumido al llegar una nueva semana', async () => {
    const restoreMon = mockNow('2026-08-03', 10, 0); // lunes
    const monToken = await adminToken(app);
    const created = await request(app).post('/api/supplies').set('Authorization', `Bearer ${monToken}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    supplyId = created.body.id;
    run('UPDATE supply_items SET consumed = 120 WHERE id = ?', [supplyId]);
    restoreMon();

    const restoreNextMon = mockNow('2026-08-10', 9, 0); // el siguiente lunes
    const didReset = checkWeeklyReset();
    expect(didReset).toBe(true);

    const history = query('SELECT * FROM supply_week_history WHERE supply_item_id = ?', [supplyId]);
    expect(history.length).toBe(1);
    expect(history[0].purchased).toBe(500);
    expect(history[0].consumed).toBe(120);
    expect(history[0].remaining).toBe(380);
    expect(history[0].week_start).toBe('2026-08-03');

    const supply = get('SELECT * FROM supply_items WHERE id = ?', [supplyId]);
    expect(supply.purchased).toBe(0);
    expect(supply.consumed).toBe(0);
    expect(supply.week_start).toBe('2026-08-10');
    restoreNextMon();
  });

  it('no reinicia si ya corrió esta semana', async () => {
    const restore = mockNow('2026-08-03', 10, 0);
    const monToken = await adminToken(app);
    await request(app).post('/api/supplies').set('Authorization', `Bearer ${monToken}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    checkWeeklyReset();
    const second = checkWeeklyReset();
    expect(second).toBe(false);
    restore();
  });

  it('permite consultar el historial semanal de un insumo', async () => {
    const restoreMon = mockNow('2026-08-03', 10, 0);
    const monToken = await adminToken(app);
    const created = await request(app).post('/api/supplies').set('Authorization', `Bearer ${monToken}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    supplyId = created.body.id;
    run('UPDATE supply_items SET consumed = 200 WHERE id = ?', [supplyId]);
    restoreMon();

    const restoreNextMon = mockNow('2026-08-10', 9, 0);
    const nextMonToken = await adminToken(app);
    checkWeeklyReset();
    const res = await request(app).get(`/api/supplies/history?supply_item_id=${supplyId}`).set('Authorization', `Bearer ${nextMonToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].remaining).toBe(300);
    restoreNextMon();
  });

  it('permite al socio consultar el historial (solo lectura)', async () => {
    const restoreMon = mockNow('2026-08-03', 10, 0);
    const monToken = await adminToken(app);
    await request(app).post('/api/supplies').set('Authorization', `Bearer ${monToken}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 500 });
    await request(app).post('/api/socios').set('Authorization', `Bearer ${monToken}`).send({ name: 'Socio', email: 'socio@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'socio@test.com', password: 'secreto123' });
    const res = await request(app).get('/api/supplies/history').set('Authorization', `Bearer ${login.body.token}`);
    restoreMon();
    expect(res.status).toBe(200);
  });
});

describe('decrementSuppliesForOrder (unidad)', () => {
  let app, token, tacoId, tortillaId;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
    const cat = run('INSERT INTO categories (name) VALUES (?)', ['Tacos']);
    const item = run('INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)', [cat.lastInsertRowid, 'Taco de asada', 40]);
    tacoId = item.lastInsertRowid;
    const tortilla = await request(app).post('/api/supplies').set('Authorization', `Bearer ${token}`).send({ name: 'Tortillas', unit: 'pieza', purchased: 100 });
    tortillaId = tortilla.body.id;
    await request(app).post('/api/supplies/recipes').set('Authorization', `Bearer ${token}`).send({ menu_item_id: tacoId, supply_item_id: tortillaId, quantity_per_unit: 1 });
  });

  it('ignora items sin menu_item_id', () => {
    decrementSuppliesForOrder([{ menu_item_id: null, quantity: 5, name: 'Personalizado', price: 10 }]);
    const tortilla = get('SELECT consumed FROM supply_items WHERE id = ?', [tortillaId]);
    expect(tortilla.consumed).toBe(0);
  });

  it('descuenta 1 por unidad cuando la receta usa cantidad_por_unidad 1', () => {
    decrementSuppliesForOrder([{ menu_item_id: tacoId, quantity: 7 }]);
    const tortilla = get('SELECT consumed FROM supply_items WHERE id = ?', [tortillaId]);
    expect(tortilla.consumed).toBe(7);
  });
});
