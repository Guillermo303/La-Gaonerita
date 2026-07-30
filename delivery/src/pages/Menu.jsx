import { useState, useEffect } from 'react';
import { menu as menuApi, customizations as customizationsApi } from '../api';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';

const DEFAULT_COLUMNS = ['Maíz', 'Harina', 'Harina Chiltepin'];

const FOOD_CATS = ['Gaonerita', 'Asadita', 'Prensadita'];

const FALLBACK_MENU = [
  { id: 1, name: 'Gaonerita', items: [
    { id: 101, name: 'Taco', price: 65, stock: 20 },
    { id: 102, name: 'Especial', price: 75, stock: 20 },
    { id: 103, name: 'Volcán', price: 75, stock: 20 },
  ]},
  { id: 2, name: 'Asadita', items: [
    { id: 201, name: 'Taco', price: 45, stock: 20 },
    { id: 202, name: 'Especial', price: 55, stock: 20 },
    { id: 203, name: 'Volcán', price: 55, stock: 20 },
  ]},
  { id: 3, name: 'Prensadita', items: [
    { id: 301, name: 'Taco', price: 40, stock: 20 },
    { id: 302, name: 'Especial', price: 50, stock: 20 },
    { id: 303, name: 'Volcán', price: 50, stock: 20 },
  ]},
  { id: 4, name: 'Rellenita', items: [
    { id: 401, name: 'Rellenita', price: 120, stock: 20 },
  ]},
  { id: 5, name: 'Aguas Frescas', items: [
    { id: 501, name: 'Horchata', price: 35, stock: 20 },
    { id: 502, name: 'Jamaica', price: 35, stock: 20 },
    { id: 503, name: 'Limón', price: 35, stock: 20 },
    { id: 504, name: 'Tamarindo', price: 35, stock: 20 },
    { id: 505, name: 'Agua Natural', price: 35, stock: 20 },
  ]},
  { id: 6, name: 'Refrescos', items: [
    { id: 601, name: 'Coca Cola', price: 35, stock: 20 },
    { id: 602, name: 'Coca Cola Light', price: 35, stock: 20 },
    { id: 603, name: 'Coca Cola Zero', price: 35, stock: 20 },
    { id: 604, name: 'Sprite', price: 35, stock: 20 },
    { id: 605, name: 'Fanta', price: 35, stock: 20 },
    { id: 606, name: 'Mundet', price: 35, stock: 20 },
    { id: 607, name: 'Fresca', price: 35, stock: 20 },
    { id: 608, name: 'Agua Mineral', price: 35, stock: 20 },
  ]},
  { id: 7, name: 'Postres', items: [
    { id: 701, name: 'Choux', price: 50, stock: 10 },
  ]},
];

export default function Menu({ onPrev, onNext }) {
  const [menuData, setMenuData] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { add, updateQty, getQty, count, total } = useCart();

  useEffect(() => {
    Promise.all([
      menuApi.getAll().catch(() => FALLBACK_MENU),
      customizationsApi.getAll().catch(() => []),
    ]).then(([menu, customGroups]) => {
      setMenuData(menu);
      const tortilla = customGroups.find(g => g.name === 'Tortilla');
      if (tortilla?.options?.length) setColumns(tortilla.options.map(o => o.name));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  if (selectedCategory) {
    const cat = selectedCategory;
    const isMatrix = FOOD_CATS.includes(cat.name);

    const subtotal = isMatrix
      ? cat.items.reduce((sum, item) => sum + columns.reduce((s, col) => s + getQty(item.id, col) * item.price, 0), 0)
      : cat.items.reduce((sum, item) => sum + getQty(item.id, '') * item.price, 0);

    return (
      <div className="max-w-6xl mx-auto px-4 py-8 pb-36">
        <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition mb-4">
          ← Todas las categorías
        </button>
        <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-ink-900 mb-6">{cat.name}</h2>

        {isMatrix ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-widest text-ink-400 pb-3 pr-4 w-1/4"></th>
                  {columns.map(col => (
                    <th key={col} className="text-center text-xs font-bold uppercase tracking-widest text-brand-600 pb-3 px-2">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.items.map(item => (
                  <tr key={item.id} className="border-t border-cream-200">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-ink-900 text-sm">{item.name}</div>
                      <div className="text-brand-600 font-extrabold text-xs mt-0.5">{formatPrice(item.price)}</div>
                    </td>
                    {columns.map(col => {
                      const qty = getQty(item.id, col);
                      return (
                        <td key={col} className="py-2 px-1 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-cream-50 rounded-lg border border-ink-200 px-1.5 py-1">
                            <button onClick={() => updateQty(item.id, -1, col)} className="w-7 h-7 rounded-md bg-white text-ink-700 font-bold text-sm hover:bg-cream-100 transition flex items-center justify-center">−</button>
                            <span className="w-6 text-center font-bold text-ink-900 text-sm">{qty}</span>
                            <button onClick={() => add(item, col)} className="w-7 h-7 rounded-md bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition flex items-center justify-center">+</button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cat.items.map(item => {
              const qty = getQty(item.id, '');
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-ink-900/5 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-ink-900">{item.name}</div>
                    <div className="text-brand-600 font-extrabold text-sm">{formatPrice(item.price)}</div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-cream-50 rounded-lg border border-ink-200 px-1.5 py-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-md bg-white text-ink-700 font-bold text-sm hover:bg-cream-100 transition flex items-center justify-center">−</button>
                    <span className="w-6 text-center font-bold text-ink-900 text-sm">{qty}</span>
                    <button onClick={() => add(item)} className="w-7 h-7 rounded-md bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition flex items-center justify-center">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="fixed bottom-4 inset-x-4 z-40">
          <div className="max-w-xl mx-auto">
            <div className="bg-ink-900 text-cream-50 rounded-2xl shadow-2xl px-6 py-4 mb-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Subtotal {cat.name}</span>
                <span className="font-extrabold text-lg">{formatPrice(subtotal)}</span>
              </div>
              {count > 0 && (
                <div className="flex items-center justify-between text-xs text-ink-300 mt-1">
                  <span>Total del pedido: {count} productos</span>
                  <span>{formatPrice(total)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedCategory(null)} className="shrink-0 px-5 py-4 rounded-full bg-white text-ink-700 font-bold text-sm border border-ink-200 shadow-lg hover:bg-cream-50 transition">
                ← Categorías
              </button>
              <button onClick={() => setSelectedCategory(null)} className="btn-grow w-full bg-brand-500 text-white rounded-full shadow-2xl px-6 py-4 hover:bg-brand-600 font-bold text-sm">
                Listo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = menuData.filter(cat => cat.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-14 pb-32">
      <div className="text-center mb-12">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">PASO 4 DE 6</p>
        <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-ink-900">Menú Principal</h1>
        <div className="flex items-center justify-center gap-3 mt-4" aria-hidden="true">
          <span className="h-px w-16 bg-brand-400" />
          <span className="text-brand-500">✦</span>
          <span className="h-px w-16 bg-brand-400" />
        </div>
        <p className="text-ink-400 mt-4">Elige una categoría para ver sus platillos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat)}
            className="card-glow bg-white rounded-2xl shadow-sm border border-ink-900/5 p-8 text-center hover:border-brand-400 hover:shadow-lg transition group"
          >
            <h2 className="font-display text-2xl font-extrabold text-ink-900 group-hover:text-brand-600 transition">{cat.name}</h2>
            {cat.description && <p className="text-ink-400 text-sm mt-2">{cat.description}</p>}
            <p className="text-brand-500 text-xs font-bold uppercase tracking-wider mt-4">{cat.items.length} platillos</p>
          </button>
        ))}
      </div>

      <div className="fixed bottom-4 inset-x-4 z-40">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={onPrev} className="shrink-0 px-5 py-4 rounded-full bg-white text-ink-700 font-bold text-sm border border-ink-200 shadow-lg hover:bg-cream-50 transition">
            ← Atrás
          </button>
          <button onClick={onNext} disabled={count === 0}
            className="btn-grow flex items-center justify-between gap-4 w-full bg-ink-900 text-cream-50 rounded-full shadow-2xl px-6 py-4 hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="flex items-center gap-3">
              <span className="bg-brand-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{count}</span>
              <span className="font-semibold">{count === 1 ? '1 producto' : `${count} productos`}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-extrabold text-lg">{formatPrice(total)}</span>
              <span className="text-brand-300 font-bold uppercase tracking-wider text-sm">Finalizar Pedido →</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
