import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// En pruebas (NODE_ENV=test) se usa un schema aparte del mismo proyecto de
// Supabase, para que las pruebas automatizadas (que hacen TRUNCATE entre
// cada test) nunca toquen los datos reales de desarrollo/producción.
const SCHEMA = process.env.NODE_ENV === 'test' ? 'test' : 'public';

let pool;

function toPgQuery(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function sanitize(params) {
  return params.map(p => p === undefined ? null : p);
}

async function execQuery(executor, sql, params = []) {
  const res = await executor.query(toPgQuery(sql), sanitize(params));
  return res.rows;
}

async function execRun(executor, sql, params = []) {
  const isInsert = /^\s*insert/i.test(sql);
  const text = isInsert ? `${sql} RETURNING *` : sql;
  const res = await executor.query(toPgQuery(text), sanitize(params));
  return { changes: res.rowCount, lastInsertRowid: res.rows[0]?.id };
}

export async function query(sql, params = []) {
  return execQuery(pool, sql, params);
}

export async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function run(sql, params = []) {
  return execRun(pool, sql, params);
}

// Para operaciones que deben ser atómicas (varias escrituras que dependen
// entre sí, ej. crear una orden + sus items): fn recibe {query, get, run}
// ligados a un único cliente/transacción en vez del pool compartido.
export async function withTransaction(fn) {
  const client = await pool.connect();
  const scoped = {
    query: (sql, params) => execQuery(client, sql, params),
    get: async (sql, params) => (await execQuery(client, sql, params))[0] || null,
    run: (sql, params) => execRun(client, sql, params)
  };
  try {
    await client.query('BEGIN');
    const result = await fn(scoped);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('admin','cocina','mesero','cliente','socio')),
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employee_details (
    user_id INTEGER PRIMARY KEY,
    puesto TEXT DEFAULT '',
    salario REAL DEFAULT 0,
    periodo_pago TEXT NOT NULL DEFAULT 'semanal' CHECK(periodo_pago IN ('semanal','quincenal','mensual')),
    prestaciones TEXT NOT NULL DEFAULT '[]',
    dias_laborales TEXT NOT NULL DEFAULT '[]',
    fecha_contratacion TEXT,
    fecha_baja TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image TEXT,
    available INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 20,
    max_stock INTEGER NOT NULL DEFAULT 20,
    ready_to_serve INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_reset TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    mesa TEXT,
    order_type TEXT NOT NULL CHECK(order_type IN ('local','domicilio')),
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','preparando','listo','completado','cancelado')),
    total REAL NOT NULL,
    notes TEXT,
    payment_method TEXT DEFAULT 'efectivo' CHECK(payment_method IN ('efectivo','transferencia','tarjeta')),
    payment_status TEXT DEFAULT 'pendiente' CHECK(payment_status IN ('pendiente','pagado','reembolsado')),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mesas (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    capacity INTEGER NOT NULL DEFAULT 4
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    mesa_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 2,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmada' CHECK(status IN ('confirmada','ocupada','completada','cancelada')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL CHECK(category IN ('renta','servicios','insumos','mantenimiento','marketing','impuestos','otro')),
    description TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'efectivo' CHECK(payment_method IN ('efectivo','transferencia','tarjeta')),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS supply_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'pieza',
    purchased REAL NOT NULL DEFAULT 0,
    consumed REAL NOT NULL DEFAULT 0,
    week_start TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS menu_item_supplies (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL,
    supply_item_id INTEGER NOT NULL,
    quantity_per_unit REAL NOT NULL DEFAULT 1,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    FOREIGN KEY (supply_item_id) REFERENCES supply_items(id),
    UNIQUE(menu_item_id, supply_item_id)
  );

  CREATE TABLE IF NOT EXISTS supply_week_history (
    id SERIAL PRIMARY KEY,
    supply_item_id INTEGER,
    supply_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    purchased REAL NOT NULL,
    consumed REAL NOT NULL,
    remaining REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supply_item_id) REFERENCES supply_items(id)
  );

  CREATE TABLE IF NOT EXISTS supply_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_week_start TEXT
  );

  CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'otro' CHECK(category IN ('cocina','mobiliario','electronica','punto_de_venta','otro')),
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price REAL DEFAULT 0,
    purchase_date TEXT,
    condition TEXT NOT NULL DEFAULT 'bueno' CHECK(condition IN ('nuevo','bueno','regular','malo','fuera_de_servicio')),
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS sales_reports (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL CHECK(period IN ('day','week','month')),
    date TEXT NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    total_revenue REAL NOT NULL,
    order_count INTEGER NOT NULL,
    data TEXT NOT NULL,
    generated_by INTEGER,
    auto INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sales_report_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_archive TEXT
  );
`;

async function seedDefaults() {
  const mesaCount = await get('SELECT COUNT(*) as count FROM mesas');
  if (Number(mesaCount.count) === 0) {
    for (let i = 1; i <= 6; i++) {
      await run('INSERT INTO mesas (name, sort_order) VALUES (?, ?)', [`Mesa ${i}`, i]);
    }
  }

  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (Number(userCount.count) === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@laganerita.com', hash, 'admin']);
  }
}

export async function initDB() {
  if (!pool) {
    // search_path se fija vía las opciones de conexión (parte del paquete de
    // arranque de cada conexión física) en vez de un `SET` posterior: bajo el
    // "Transaction pooler" de Supabase (pgbouncer), un `SET` emitido después
    // de abrir la conexión puede perderse o correr en carrera con la primera
    // consulta real si el pool abre la conexión y la usa casi al mismo tiempo.
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${SCHEMA}`,
      ssl: { rejectUnauthorized: false }
    });
  }

  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
  await pool.query(SCHEMA_SQL);
  await seedDefaults();

  return pool;
}

export async function resetTestSchema() {
  const tables = await query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'test'
  `);
  if (tables.length) {
    const names = tables.map(t => `"test"."${t.tablename}"`).join(', ');
    await pool.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
  }
  await seedDefaults();
}

export default { initDB, query, get, run, withTransaction, resetTestSchema };
