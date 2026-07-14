import { initDB, query, run } from './db.js';

const menuData = [
  { category: 'Especialidades de Asada', description: 'Cortes de res asados al carbón', items: [
    { name: 'Taco de asada', price: 40, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=700&q=80' },
    { name: 'Volcán de asada', price: 50, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80' },
    { name: 'Taco de costra de asada', price: 50, image: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=700&q=80' },
  ]},
  { category: 'Especialidades de Gaonera', description: 'Nuestro corte estrella', items: [
    { name: 'Taco de Gaonera', price: 60, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&w=700&q=80' },
    { name: 'Volcán de Gaonera', price: 70, image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=700&q=80' },
    { name: 'Taco de costra de Gaonera', price: 70, image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=700&q=80' },
  ]},
  { category: 'Postres', description: 'Dulce final', items: [
    { name: 'Chux', price: 40, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=700&q=80' },
  ]},
  { category: 'Complementa tu experiencia', description: 'Acompañamientos y salsas', items: [
    { name: 'Salsa naranja cremosa', price: 0, image: 'https://images.unsplash.com/photo-1734772257288-d53770c7707f?auto=format&fit=crop&w=700&q=80' },
    { name: 'Salsa verde cremosa', price: 0, image: 'https://images.unsplash.com/photo-1722239312486-2675eac7cec3?auto=format&fit=crop&w=700&q=80' },
    { name: 'Cebolla asada', price: 0, image: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=700&q=80' },
    { name: 'Cebolla y Cilantro frescos', price: 0, image: 'https://images.unsplash.com/photo-1546393273-5ae641051e01?auto=format&fit=crop&w=700&q=80' },
    { name: 'Limones', price: 0, image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=700&q=80' },
    { name: 'Totopos', price: 0, image: 'https://images.unsplash.com/photo-1764025248642-6b0b403ac004?auto=format&fit=crop&w=700&q=80' },
  ]},
];

async function seed() {
  await initDB();
  const existing = query("SELECT COUNT(*) as count FROM categories");
  if (existing.length && existing[0].count > 0) {
    console.log('Ya hay datos en el menú, omitiendo seed');
    return;
  }
  menuData.forEach((cat, i) => {
    const result = run('INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)', [cat.category, cat.description, i]);
    const catId = result.lastInsertRowid;
    cat.items.forEach((item, j) => {
      run('INSERT INTO menu_items (category_id, name, price, image, sort_order) VALUES (?, ?, ?, ?, ?)', [catId, item.name, item.price, item.image, j]);
    });
  });
  console.log('Menú inicial creado exitosamente');
}

seed();
