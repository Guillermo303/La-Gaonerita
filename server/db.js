import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// DB_FILE puede ser un path absoluto (ej. un disco persistente montado en
// Render) o uno relativo al directorio server/; ':memory:' desactiva la
// persistencia a disco (usado en las pruebas automatizadas).
const DB_PATH = process.env.DB_FILE
  ? (isAbsolute(process.env.DB_FILE) ? process.env.DB_FILE : join(__dirname, process.env.DB_FILE))
  : join(__dirname, 'data.db');
const PERSIST = process.env.DB_FILE !== ':memory:';

let db;

export async function initDB() {
  const SQL = await initSqlJs();
  if (PERSIST && existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('admin','cocina','mesero','cliente','socio')),
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  try { db.run("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1"); saveDB(); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"); saveDB(); } catch {}

  // Bases de datos creadas antes de agregar el rol 'socio' tienen un CHECK
  // antiguo que lo rechaza; sqlite no permite alterar un CHECK existente,
  // así que se reconstruye la tabla si el CHECK no incluye 'socio'.
  const usersTableSql = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  const usersSql = usersTableSql.length ? usersTableSql[0].values[0][0] : '';
  if (usersSql && !usersSql.includes("'socio'")) {
    // Renombrar/recrear la tabla padre con FKs activas provoca errores de
    // integridad referencial a mitad del proceso; se desactivan mientras dura.
    db.run('PRAGMA foreign_keys = OFF');
    db.run('ALTER TABLE users RENAME TO users_old');
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('admin','cocina','mesero','cliente','socio')),
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Selección explícita por nombre de columna: 'active' y 'token_version'
    // se agregaron con ALTER TABLE ADD COLUMN en versiones anteriores, así
    // que quedaron al final de users_old y no coinciden en posición con el
    // orden de columnas de la tabla nueva. Un `SELECT *` posicional aquí
    // desordenaría los valores entre columnas.
    db.run(`INSERT INTO users (id, name, email, password, role, phone, active, token_version, created_at)
            SELECT id, name, email, password, role, phone, active, token_version, created_at FROM users_old`);
    db.run('DROP TABLE users_old');
    db.run('PRAGMA foreign_keys = ON');
    saveDB();
  }

  db.run(`CREATE TABLE IF NOT EXISTS employee_details (
    user_id INTEGER PRIMARY KEY,
    puesto TEXT DEFAULT '',
    salario REAL DEFAULT 0,
    periodo_pago TEXT NOT NULL DEFAULT 'semanal' CHECK(periodo_pago IN ('semanal','quincenal','mensual')),
    prestaciones TEXT NOT NULL DEFAULT '[]',
    dias_laborales TEXT NOT NULL DEFAULT '[]',
    fecha_contratacion TEXT,
    fecha_baja TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  )`);
  try { db.run("ALTER TABLE menu_items ADD COLUMN stock INTEGER NOT NULL DEFAULT 20"); saveDB(); } catch {}
  try { db.run("ALTER TABLE menu_items ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 20"); saveDB(); } catch {}
  try { db.run("ALTER TABLE menu_items ADD COLUMN ready_to_serve INTEGER NOT NULL DEFAULT 0"); saveDB(); } catch {}

  db.run(`CREATE TABLE IF NOT EXISTS inventory_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_reset TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    capacity INTEGER NOT NULL DEFAULT 4
  )`);
  try { db.run("ALTER TABLE mesas ADD COLUMN capacity INTEGER NOT NULL DEFAULT 4"); saveDB(); } catch {}

  const mesaCount = db.exec("SELECT COUNT(*) as count FROM mesas");
  const mCount = mesaCount.length ? mesaCount[0].values[0][0] : 0;
  if (mCount === 0) {
    for (let i = 1; i <= 6; i++) {
      db.run('INSERT INTO mesas (name, sort_order) VALUES (?, ?)', [`Mesa ${i}`, i]);
    }
    saveDB();
  }

  try { db.run("ALTER TABLE orders ADD COLUMN mesa TEXT"); saveDB(); } catch {}

  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mesa_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 2,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmada' CHECK(status IN ('confirmada','ocupada','completada','cancelada')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('renta','servicios','insumos','mantenimiento','marketing','impuestos','otro')),
    description TEXT,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'efectivo' CHECK(payment_method IN ('efectivo','transferencia','tarjeta')),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS supply_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'pieza',
    purchased REAL NOT NULL DEFAULT 0,
    consumed REAL NOT NULL DEFAULT 0,
    week_start TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS menu_item_supplies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    supply_item_id INTEGER NOT NULL,
    quantity_per_unit REAL NOT NULL DEFAULT 1,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    FOREIGN KEY (supply_item_id) REFERENCES supply_items(id),
    UNIQUE(menu_item_id, supply_item_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS supply_week_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supply_item_id INTEGER,
    supply_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    purchased REAL NOT NULL,
    consumed REAL NOT NULL,
    remaining REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supply_item_id) REFERENCES supply_items(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS supply_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_week_start TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'otro' CHECK(category IN ('cocina','mobiliario','electronica','punto_de_venta','otro')),
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price REAL DEFAULT 0,
    purchase_date TEXT,
    condition TEXT NOT NULL DEFAULT 'bueno' CHECK(condition IN ('nuevo','bueno','regular','malo','fuera_de_servicio')),
    location TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL CHECK(period IN ('day','week','month')),
    date TEXT NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    total_revenue REAL NOT NULL,
    order_count INTEGER NOT NULL,
    data TEXT NOT NULL,
    generated_by INTEGER,
    auto INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales_report_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_archive TEXT
  )`);

  const row = db.exec("SELECT COUNT(*) as count FROM users");
  const count = row.length ? row[0].values[0][0] : 0;
  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@laganerita.com', hash, 'admin']);
    saveDB();
  }

  return db;
}

function saveDB() {
  if (!PERSIST) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, buffer);
}

function sanitize(params) {
  return params.map(p => p === undefined ? null : p);
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(sanitize(params));
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(sanitize(params));
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function run(sql, params = []) {
  db.run(sql, sanitize(params));
  const lastInsertRowid = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
  const changes = db.getRowsModified();
  saveDB();
  return { changes, lastInsertRowid };
}

export default { initDB, query, get, run };
