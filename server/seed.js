import { initDB, query, run } from './db.js';

const menuData = [
  { category: 'Tacos', description: 'Tacos tradicionales', items: [
    { name: 'Taco de Pastor', price: 25, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: 'Carne de cerdo marinada en achiote, piña y especias' },
    { name: 'Taco de Suadero', price: 28, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: 'Carne de res suave y jugosa' },
    { name: 'Taco de Carnitas', price: 25, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: 'Cerdo confitado en su propia grasa' },
    { name: 'Taco de Chorizo', price: 22, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: 'Chorizo casero picante' },
    { name: 'Taco de Barbacoa', price: 30, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: 'Borgoña de res estilo Hidalgo' },
  ]},
  { category: 'Especialidades', description: 'Platillos especiales', items: [
    { name: 'Torta de Pastor', price: 55, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop', description: 'Pan telera con pastor, piña, cebolla y cilantro' },
    { name: 'Torta de Suadero', price: 60, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop', description: 'Pan telera con suadero, frijoles y aguacate' },
    { name: 'Volcán de Pastor', price: 35, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop', description: 'Tortilla de queso fundido con pastor y salsa' },
    { name: 'Costra de Queso', price: 45, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop', description: 'Queso fundido crujiente con pastor o suadero' },
    { name: 'Gringa', price: 50, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop', description: 'Tortilla de harina con queso y pastor' },
  ]},
  { category: 'Bebidas', description: 'Refrescos y aguas', items: [
    { name: 'Coca-Cola 600ml', price: 20, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop', description: 'Refresco de cola clásico' },
    { name: 'Coca-Cola 2L', price: 35, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop', description: 'Refresco familiar' },
    { name: 'Agua Fresca 500ml', price: 15, image: 'https://images.unsplash.com/photo-1622501088824-6e1f2d4b8c4c?w=400&h=300&fit=crop', description: 'Agua de frutas natural' },
    { name: 'Agua Fresca 1L', price: 25, image: 'https://images.unsplash.com/photo-1622501088824-6e1f2d4b8c4c?w=400&h=300&fit=crop', description: 'Agua de frutas familiar' },
    { name: 'Boing de Mango', price: 18, image: 'https://images.unsplash.com/photo-1622501088824-6e1f2d4b8c4c?w=400&h=300&fit=crop', description: 'Néctar de mango' },
  ]},
  { category: 'Extras', description: 'Complementos y acompañamientos', items: [
    { name: 'Orden de Guacamole', price: 30, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop', description: 'Aguacate machacado con tomate, cebolla, cilantro y limón' },
    { name: 'Orden de Queso Fundido', price: 35, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop', description: 'Queso Oaxaca derretido con chorizo' },
    { name: 'Frijoles Charros', price: 25, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop', description: 'Frijoles bayos con tocino, chile y especias' },
    { name: 'Arroz', price: 15, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop', description: 'Arroz rojo mexicano' },
    { name: 'Tortillas Extra (10)', price: 10, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop', description: 'Tortillas de maíz hechas a mano' },
  ]},
  { category: 'Combos', description: 'Combos especiales', items: [
    { name: 'Combo 3 Tacos + Bebida', price: 80, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: '3 tacos a elegir + refresco 600ml' },
    { name: 'Combo 5 Tacos + Bebida', price: 120, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: '5 tacos a elegir + refresco 600ml' },
    { name: 'Combo Familiar (10 Tacos + 2 Bebidas)', price: 220, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', description: '10 tacos surtidos + 2 refrescos 600ml' },
    { name: 'Combo Torta + Bebida', price: 75, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop', description: 'Torta a elegir + refresco 600ml' },
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
