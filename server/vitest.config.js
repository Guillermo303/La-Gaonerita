import { defineConfig } from 'vitest/config';
import 'dotenv/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: 'test-secret-do-not-use-in-production',
      FRONTEND_URL: 'http://localhost:5173'
    },
    testTimeout: 20000,
    // resetTestSchema() (llamado en cada beforeEach vía freshApp()) hace un
    // TRUNCATE real contra Supabase por red; el default de 10s de Vitest para
    // hooks es demasiado ajustado para eso bajo latencia variable.
    hookTimeout: 20000,
    // Todas las pruebas comparten un único schema "test" en Supabase (a
    // diferencia de sql.js, donde cada prueba tenía su propia base en
    // memoria). resetTestSchema() hace TRUNCATE entre pruebas, así que los
    // archivos deben correr en serie o se pisan los datos entre sí.
    fileParallelism: false
  }
});
