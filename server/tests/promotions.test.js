import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';

async function adminToken(app) {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@laganerita.com', password: 'admin123' });
  return res.body.token;
}

function toDateStr(d) {
  return d.toLocaleDateString('en-CA');
}

describe('Promociones', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    token = await adminToken(app);
  });

  it('rechaza crear una promoción sin autenticación', async () => {
    const res = await request(app).post('/api/promotions').send({ name: '3x1 Lunes' });
    expect(res.status).toBe(401);
  });

  it('rechaza que un no-admin/socio cree una promoción', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/promotions').set('Authorization', `Bearer ${login.body.token}`).send({ name: '3x1 Lunes' });
    expect(res.status).toBe(403);
  });

  it('rechaza un tipo de vigencia inválido', async () => {
    const res = await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`).send({ name: 'Promo', schedule_type: 'diario' });
    expect(res.status).toBe(400);
  });

  it('una promoción con fecha vigente hoy aparece en el endpoint público', async () => {
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    const tomorrow = toDateStr(new Date(Date.now() + 86400000));
    await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Promo Vigente', schedule_type: 'date_range', start_date: yesterday, end_date: tomorrow });

    const res = await request(app).get('/api/promotions');
    expect(res.status).toBe(200);
    expect(res.body.map(p => p.name)).toContain('Promo Vigente');
  });

  it('una promoción con fecha ya vencida NO aparece en el endpoint público', async () => {
    const twoDaysAgo = toDateStr(new Date(Date.now() - 2 * 86400000));
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Promo Vencida', schedule_type: 'date_range', start_date: twoDaysAgo, end_date: yesterday });

    const res = await request(app).get('/api/promotions');
    expect(res.body.map(p => p.name)).not.toContain('Promo Vencida');
  });

  it('una promoción semanal aparece solo el/los días configurados', async () => {
    const today = new Date().getDay();
    const otherDay = (today + 1) % 7;

    await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Promo Hoy', schedule_type: 'weekly', days_of_week: String(today) });
    await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Promo Otro Día', schedule_type: 'weekly', days_of_week: String(otherDay) });

    const res = await request(app).get('/api/promotions');
    const names = res.body.map(p => p.name);
    expect(names).toContain('Promo Hoy');
    expect(names).not.toContain('Promo Otro Día');
  });

  it('una promoción desactivada no aparece aunque su fecha sea vigente', async () => {
    const created = await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Promo Desactivable', schedule_type: 'weekly', days_of_week: String(new Date().getDay()) });
    await request(app).put(`/api/promotions/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({ active: 0 });

    const res = await request(app).get('/api/promotions');
    expect(res.body.map(p => p.name)).not.toContain('Promo Desactivable');

    const all = await request(app).get('/api/promotions/all').set('Authorization', `Bearer ${token}`);
    expect(all.body.find(p => p.id === created.body.id).active).toBe(0);
  });

  it('/all requiere admin/socio y devuelve todas las promociones sin filtrar', async () => {
    const noAuth = await request(app).get('/api/promotions/all');
    expect(noAuth.status).toBe(401);

    const twoDaysAgo = toDateStr(new Date(Date.now() - 2 * 86400000));
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Promo Vencida', schedule_type: 'date_range', start_date: twoDaysAgo, end_date: yesterday });

    const res = await request(app).get('/api/promotions/all').set('Authorization', `Bearer ${token}`);
    expect(res.body.map(p => p.name)).toContain('Promo Vencida');
  });

  it('permite eliminar una promoción', async () => {
    const created = await request(app).post('/api/promotions').set('Authorization', `Bearer ${token}`).send({ name: 'Borrar Esta' });
    const del = await request(app).delete(`/api/promotions/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const all = await request(app).get('/api/promotions/all').set('Authorization', `Bearer ${token}`);
    expect(all.body.find(p => p.id === created.body.id)).toBeUndefined();
  });
});
