import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = process.env.DB_FILE ? join(__dirname, process.env.DB_FILE) : join(__dirname, 'data.db');
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
    role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('admin','cocina','mesero','cliente')),
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    FOREIGN KEY (category_id) REFERENCES categories(id)
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
    sort_order INTEGER DEFAULT 0
  )`);

  const mesaCount = db.exec("SELECT COUNT(*) as count FROM mesas");
  const mCount = mesaCount.length ? mesaCount[0].values[0][0] : 0;
  if (mCount === 0) {
    for (let i = 1; i <= 6; i++) {
      db.run('INSERT INTO mesas (name, sort_order) VALUES (?, ?)', [`Mesa ${i}`, i]);
    }
    saveDB();
  }

  try { db.run("ALTER TABLE orders ADD COLUMN mesa TEXT"); saveDB(); } catch {}
  try { db.run("ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0"); saveDB(); } catch {}
  try { db.run("ALTER TABLE orders ADD COLUMN promotion_id INTEGER"); saveDB(); } catch {}
  try { db.run("ALTER TABLE orders ADD COLUMN promotion_name TEXT"); saveDB(); } catch {}

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    stock REAL NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'pieza',
    min_stock REAL DEFAULT 5,
    cost_price REAL DEFAULT 0,
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

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'efectivo',
    person_name TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
    discount_value REAL NOT NULL,
    min_purchase REAL DEFAULT 0,
    applicable_items TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  const defaults = {
    phone: '5512345678',
    whatsapp: '525512345678',
    email: 'contacto@laganerita.com',
    address: 'Av. Principal 123, Col. Centro',
    facebook: 'https://facebook.com/laganerita',
    instagram: 'https://instagram.com/laganerita',
    tiktok: 'https://tiktok.com/@laganerita',
    business_hours: 'Lun-Sáb: 10:00-22:00, Dom: 11:00-21:00'
  };
  for (const [k, v] of Object.entries(defaults)) {
    const existing = get('SELECT * FROM settings WHERE key = ?', [k]);
    if (!existing) run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, v]);
  }
  saveDB();

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
  writeFileSync(DB_PATH, buffer);
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function run(sql, params = []) {
  db.run(sql, params);
  const lastInsertRowid = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
  const changes = db.getRowsModified();
  saveDB();
  return { changes, lastInsertRowid };
}

export default { initDB, query, get, run };
