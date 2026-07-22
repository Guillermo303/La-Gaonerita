import { initDB, query, run } from '../../db.js';

await initDB();

const before = query('SELECT id, name, email, role, phone, active, token_version, created_at FROM users ORDER BY id');

let socioInsertOk = true;
try {
  run("INSERT INTO users (name, email, password, role) VALUES ('Socio Test', 'socio-migration@test.com', 'x', 'socio')");
} catch {
  socioInsertOk = false;
}

process.stdout.write(JSON.stringify({ before, socioInsertOk }));
