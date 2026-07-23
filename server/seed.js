import { initDB, query, run } from './db.js';

const menuData = [
  { category: 'Tacos', description: 'Tacos tradicionales', items: [
    { name: 'Taco de Pastor', price: 25 },
    { name: 'Taco de Suadero', price: 28 },
    { name: 'Taco de Carnitas', price: 25 },
    { name: 'Taco de Chorizo', price: 22 },
    { name: 'Taco de Barbacoa', price: 30 },
  ]},
  { category: 'Especialidades', description: 'Platillos especiales', items: [
    { name: 'Torta de Pastor', price: 55 },
    { name: 'Torta de Suadero', price: 60 },
    { name: 'Volcán de Pastor', price: 35 },
    { name: 'Costra de Queso', price: 45 },
    { name: 'Gringa', price: 50 },
  ]},
  { category: 'Bebidas', description: 'Refrescos y aguas', items: [
    { name: 'Coca-Cola 600ml', price: 20 },
    { name: 'Coca-Cola 2L', price: 35 },
    { name: 'Agua Fresca 500ml', price: 15 },
    { name: 'Agua Fresca 1L', price: 25 },
    { name: 'Boing de Mango', price: 18 },
  ]},
  { category: 'Extras', description: 'Complementos', items: [
    { name: 'Orden de Guacamole', price: 30 },
    { name: 'Orden de Queso Fundido', price: 35 },
    { name: 'Frijoles Charros', price: 25 },
    { name: 'Arroz', price: 15 },
    { name: 'Tortillas Extra (10)', price: 10 },
  ]},
  { category: 'Combos', description: 'Combos especiales', items: [
    { name: 'Combo 3 Tacos + Bebida', price: 80 },
    { name: 'Combo 5 Tacos + Bebida', price: 120 },
    { name: 'Combo Familiar (10 Tacos + 2 Bebidas)', price: 220 },
    { name: 'Combo Torta + Bebida', price: 75 },
  ]},
];

async function seed() {
  await initDB();
  const existing = await query("SELECT COUNT(*) as count FROM categories");
  if (existing.length && Number(existing[0].count) > 0) {
    console.log('Ya hay datos en el menú, omitiendo seed');
    return;
  }
  for (let i = 0; i < menuData.length; i++) {
    const cat = menuData[i];
    const result = await run('INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)', [cat.category, cat.description, i]);
    const catId = result.lastInsertRowid;
    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      await run('INSERT INTO menu_items (category_id, name, price, sort_order) VALUES (?, ?, ?, ?)', [catId, item.name, item.price, j]);
    }
  }
  console.log('Menú inicial creado exitosamente');
}

seed();
