import { createApp } from '../app.js';
import { initDB, resetTestSchema } from '../db.js';

let initialized = false;

export async function freshApp() {
  if (!initialized) {
    await initDB();
    initialized = true;
  }
  await resetTestSchema();
  const { app } = createApp();
  return app;
}
