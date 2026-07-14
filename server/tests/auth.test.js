import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';

describe('POST /api/auth/register', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('creates a new client user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana', email: 'ana@test.com', password: 'secreto123'
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('cliente');
  });

  it('ignores an attempt to self-assign the admin role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana', email: 'ana2@test.com', password: 'secreto123', role: 'admin'
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('cliente');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'dup@test.com', password: 'secreto123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Otra', email: 'dup@test.com', password: 'secreto123' });
    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'short@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'nofields@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  let app;
  beforeEach(async () => {
    app = await freshApp();
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'secreto123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nadie@test.com', password: 'secreto123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let app, token;
  beforeEach(async () => {
    app = await freshApp();
    const res = await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'secreto123' });
    token = res.body.token;
  });

  it('returns the current user with a valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@test.com');
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
