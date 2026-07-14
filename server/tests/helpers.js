import { createApp } from '../app.js';
import { initDB } from '../db.js';

export async function freshApp() {
  await initDB();
  const { app } = createApp();
  return app;
}
