import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { freshApp } from './helpers.js';

describe('GET /api/health', () => {
  let app;
  beforeEach(async () => { app = await freshApp(); });

  it('responds ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
