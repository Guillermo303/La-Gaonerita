import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

describe('GET /api/customizations', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('es público y ya trae los grupos sembrados por defecto', async () => {
    const res = await request(app).get('/api/customizations');
    expect(res.status).toBe(200);
    const names = res.body.map(g => g.name);
    expect(names).toContain('Tortilla');
    expect(names).toContain('Acompañamientos');
    const tortilla = res.body.find(g => g.name === 'Tortilla');
    expect(tortilla.selection_type).toBe('single');
    expect(tortilla.options.map(o => o.name)).toContain('Maíz');
  });
});

describe('Administración de grupos y opciones', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza crear un grupo sin autenticación', async () => {
    const res = await request(app).post('/api/customizations/groups').send({ name: 'Extras' });
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin cree un grupo', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${login.body.token}`).send({ name: 'Extras' });
    expect(res.status).toBe(403);
  });

  it('permite al admin crear un grupo con selección múltiple', async () => {
    const res = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Extras', selection_type: 'multiple' });
    expect(res.status).toBe(201);
    expect(res.body.selection_type).toBe('multiple');
  });

  it('rechaza un tipo de selección inválido', async () => {
    const res = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Extras', selection_type: 'todas' });
    expect(res.status).toBe(400);
  });

  it('permite editar el nombre y tipo de un grupo', async () => {
    const created = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Extras' });
    const res = await request(app).put(`/api/customizations/groups/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({ name: 'Extras Renombrado', selection_type: 'multiple' });
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/customizations');
    const group = list.body.find(g => g.id === created.body.id);
    expect(group.name).toBe('Extras Renombrado');
    expect(group.selection_type).toBe('multiple');
  });

  it('permite agregar una opción a un grupo', async () => {
    const created = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Extras' });
    const res = await request(app).post(`/api/customizations/groups/${created.body.id}/options`).set('Authorization', `Bearer ${token}`).send({ name: 'Queso Extra' });
    expect(res.status).toBe(201);
    const list = await request(app).get('/api/customizations');
    const group = list.body.find(g => g.id === created.body.id);
    expect(group.options.map(o => o.name)).toContain('Queso Extra');
  });

  it('permite eliminar una opción', async () => {
    const created = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Extras' });
    const option = await request(app).post(`/api/customizations/groups/${created.body.id}/options`).set('Authorization', `Bearer ${token}`).send({ name: 'Queso Extra' });
    const del = await request(app).delete(`/api/customizations/options/${option.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/customizations');
    const group = list.body.find(g => g.id === created.body.id);
    expect(group.options.length).toBe(0);
  });

  it('eliminar un grupo borra también sus opciones sin error de llave foránea', async () => {
    const created = await request(app).post('/api/customizations/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Extras' });
    await request(app).post(`/api/customizations/groups/${created.body.id}/options`).set('Authorization', `Bearer ${token}`).send({ name: 'Queso Extra' });
    const del = await request(app).delete(`/api/customizations/groups/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/customizations');
    expect(list.body.find(g => g.id === created.body.id)).toBeUndefined();
  });
});
