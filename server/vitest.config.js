import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DB_FILE: ':memory:',
      JWT_SECRET: 'test-secret-do-not-use-in-production',
      FRONTEND_URL: 'http://localhost:5173'
    },
    testTimeout: 10000
  }
});
