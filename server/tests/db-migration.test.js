import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const relDbFile = 'tests/tmp/pre-socio-migration.db';
const absDbFile = join(serverRoot, relDbFile);
const fixtureScript = join(__dirname, 'fixtures', 'run-migration-check.mjs');

// Reconstruye el esquema exacto que existía antes de agregar el rol 'socio':
// `active`/`token_version` se sumaron después con ALTER TABLE ADD COLUMN, por
// lo que quedan al final físicamente aunque el CREATE TABLE actual los declare
// antes de `created_at`. Este es justo el desajuste que causó la corrupción.
async function buildLegacyDbFile() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('admin','cocina','mesero','cliente')),
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  db.run('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');

  const hash = bcrypt.hashSync('admin123', 10);
  db.run("INSERT INTO users (name, email, password, role, active, token_version, created_at) VALUES (?, ?, ?, 'admin', 1, 0, '2020-01-01 08:00:00')", ['Admin', 'admin@laganerita.com', hash]);
  // Valores atípicos a propósito: si la migración desordena columnas por
  // posición, esto se detecta de inmediato (un despedido no debe volver a
  // aparecer como activo, y token_version=7 no debe convertirse en una fecha).
  db.run("INSERT INTO users (name, email, password, role, active, token_version, created_at) VALUES (?, ?, ?, 'mesero', 0, 7, '2021-06-15 12:30:00')", ['Despedido', 'despedido@test.com', hash]);

  mkdirSync(join(serverRoot, 'tests/tmp'), { recursive: true });
  const { writeFileSync } = await import('fs');
  writeFileSync(absDbFile, Buffer.from(db.export()));
}

describe('Migración del esquema de usuarios (rol socio)', () => {
  afterEach(() => {
    if (existsSync(absDbFile)) unlinkSync(absDbFile);
  });

  it('preserva active, token_version y created_at exactamente al migrar una base de datos anterior al rol socio', async () => {
    await buildLegacyDbFile();

    const stdout = execFileSync('node', [fixtureScript], {
      cwd: serverRoot,
      env: { ...process.env, DB_FILE: relDbFile, JWT_SECRET: 'test-secret-do-not-use-in-production' },
      encoding: 'utf8'
    });
    const { before, socioInsertOk } = JSON.parse(stdout);

    const admin = before.find(u => u.email === 'admin@laganerita.com');
    const despedido = before.find(u => u.email === 'despedido@test.com');

    expect(admin.active).toBe(1);
    expect(admin.token_version).toBe(0);
    expect(admin.created_at).toBe('2020-01-01 08:00:00');

    expect(despedido.active).toBe(0);
    expect(despedido.token_version).toBe(7);
    expect(despedido.created_at).toBe('2021-06-15 12:30:00');
    expect(despedido.role).toBe('mesero');

    expect(socioInsertOk).toBe(true);
  });
});
