import { useState, useEffect } from 'react';
import { pos as posApi } from '../api';
import { formatPrice } from '../lib/utils';
import { exportCSV } from '../lib/exportCSV';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'general', stock: 0, unit: 'pieza', min_stock: 5, cost_price: 0 });

  const load = () => posApi.getInventory().then(setItems).catch(console.error);
  useEffect(() => { load(); }, []);

  const addItem = async () => {
    if (!newItem.name) return;
    await posApi.createInventoryItem(newItem); setNewItem({ name: '', category: 'general', stock: 0, unit: 'pieza', min_stock: 5, cost_price: 0 }); load();
  };
  const updateStock = async (id, stock) => { await posApi.updateStock(id, Math.max(0, parseInt(stock) || 0)); load(); };
  const delItem = async (id) => { if (confirm('¿Eliminar?')) { await posApi.deleteInventory(id); load(); } };

  const lowStock = items.filter(i => i.stock <= i.min_stock);
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black font-display text-ink-900">📦 Inventario</h1>
          {lowStock.length > 0 && <p className="text-red-500 text-sm font-semibold mt-1">⚠️ {lowStock.length} producto{(lowStock.length !== 1) ? 's' : ''} con stock bajo</p>}
        </div>
        <button onClick={() => exportCSV(items.map(i => ({ Categoria: i.category, Producto: i.name, Stock: i.stock, Unidad: i.unit, Stock_minimo: i.min_stock, Costo: i.cost_price })), 'inventario')} className="border border-ink-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-ink-50 transition">⬇ Exportar</button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-ink-100 mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-3">Agregar producto</div>
        <div className="flex flex-wrap gap-2">
          <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Nombre" className="flex-1 min-w-[120px] p-2 border border-ink-200 rounded-lg text-sm" />
          <input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="Categoría" className="w-28 p-2 border border-ink-200 rounded-lg text-sm" />
          <input type="number" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: parseFloat(e.target.value) || 0 })} placeholder="Stock" className="w-20 p-2 border border-ink-200 rounded-lg text-sm" />
          <input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} placeholder="Unidad" className="w-20 p-2 border border-ink-200 rounded-lg text-sm" />
          <input type="number" value={newItem.min_stock} onChange={e => setNewItem({ ...newItem, min_stock: parseFloat(e.target.value) || 0 })} placeholder="Min" className="w-16 p-2 border border-ink-200 rounded-lg text-sm" />
          <input type="number" value={newItem.cost_price} onChange={e => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) || 0 })} placeholder="$ Costo" className="w-20 p-2 border border-ink-200 rounded-lg text-sm" />
          <button onClick={addItem} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+</button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-2">⚠️ Stock Bajo</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.map(item => (
              <div key={item.id} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-ink-900 text-sm">{item.name}</div>
                  <div className="text-xs text-red-600">{item.stock} / {item.min_stock} {item.unit}</div>
                </div>
                <input type="number" defaultValue={item.stock} onBlur={e => updateStock(item.id, e.target.value)} className="w-16 p-1 border border-red-300 rounded text-sm text-center" />
              </div>
            ))}
          </div>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-400 mb-2">{cat}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider"><th className="p-3 text-left">Producto</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Mín</th><th className="p-3 text-right">Unidad</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right"></th></tr></thead>
              <tbody>
                {items.filter(i => i.category === cat).map(item => (
                  <tr key={item.id} className={`border-t border-ink-100 ${item.stock <= item.min_stock ? 'bg-red-50/50' : ''}`}>
                    <td className="p-3 font-medium text-ink-900">{item.name}</td>
                    <td className="p-3 text-right"><input type="number" defaultValue={item.stock} onBlur={e => updateStock(item.id, e.target.value)} className={`w-16 p-1 border rounded text-sm text-center ${item.stock <= item.min_stock ? 'border-red-300' : 'border-ink-200'}`} /></td>
                    <td className="p-3 text-right text-ink-400">{item.min_stock}</td>
                    <td className="p-3 text-right text-ink-400">{item.unit}</td>
                    <td className="p-3 text-right text-ink-400">{formatPrice(item.cost_price)}</td>
                    <td className="p-3 text-right"><button onClick={() => delItem(item.id)} className="text-xs text-red-400 hover:text-red-600">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
