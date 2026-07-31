import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orders as ordersApi } from '../../api';
import { formatPrice } from '../../lib/utils';
import MesaSelector from '../../components/MesaSelector';

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

export default function NewOrder() {
  const [searchParams] = useSearchParams();
  const [menuData] = useState(FALLBACK_MENU);
  const [columns] = useState(DEFAULT_COLUMNS);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', type: 'local', notes: '' });
  const [mesa, setMesa] = useState(searchParams.get('mesa') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const itemKey = (menuItemId, variant = '') => variant ? `${menuItemId}:${variant}` : String(menuItemId);

  const addItem = (item, variant = '') => {
    const key = itemKey(item.id, variant);
    setCart(prev => {
      const existing = prev.find(i => itemKey(i.menu_item_id, i.variant) === key);
      if (existing) return prev.map(i => itemKey(i.menu_item_id, i.variant) === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: variant ? `${item.name} (${variant})` : item.name, price: item.price, quantity: 1, variant: variant || null }];
    });
  };

  const updateQty = (id, delta, variant = '') => {
    const key = itemKey(id, variant);
    setCart(prev => prev.flatMap(i => {
      if (itemKey(i.menu_item_id, i.variant) !== key) return [i];
      const q = i.quantity + delta;
      return q <= 0 ? [] : [{ ...i, quantity: q }];
    }));
  };

  const getQty = (id, variant = '') => {
    const key = itemKey(id, variant);
    return cart.find(i => itemKey(i.menu_item_id, i.variant) === key)?.quantity || 0;
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name || cart.length === 0) { setError('Nombre y al menos un producto requerido'); return; }
    setLoading(true);
    setError('');
    try {
      const order = await ordersApi.create({
        customer_name: customer.name,
        customer_phone: customer.phone || null,
        customer_address: customer.type === 'domicilio' ? customer.address : null,
        mesa: customer.type === 'local' ? mesa : null,
        order_type: customer.type,
        notes: customer.notes || null,
        payment_method: 'efectivo',
        items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, notes: i.variant || null }))
      });
      navigate('/waiter');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 pb-20 lg:pb-0">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/waiter')} className="text-ink-400 hover:text-ink-600 text-lg">←</button>
          <h1 className="text-2xl font-bold">Nueva Orden</h1>
          {mesa && <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{mesa}</span>}
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-md space-y-3">
          <div>
            <label className="block text-sm font-medium">Cliente</label>
            <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="w-full mt-1 p-2 border rounded" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium">Teléfono</label>
              <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="w-full mt-1 p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Tipo</label>
              <select value={customer.type} onChange={e => {
                setCustomer({ ...customer, type: e.target.value });
                if (e.target.value !== 'local') setMesa('');
              }} className="w-full mt-1 p-2 border rounded">
                <option value="local">Local</option>
                <option value="domicilio">Domicilio</option>
              </select>
            </div>
          </div>
          {customer.type === 'local' && (
            <div className="pt-1">
              <MesaSelector selected={mesa} onSelect={setMesa} showLabel={true} />
            </div>
          )}
          {customer.type === 'domicilio' && (
            <div>
              <label className="block text-sm font-medium">Dirección</label>
              <textarea value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className="w-full mt-1 p-2 border rounded" rows="2" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Notas</label>
            <textarea value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} className="w-full mt-1 p-2 border rounded" rows="2" />
          </div>
        </form>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-3">Menú</h2>
          {selectedCategory ? (
            <div>
              <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition mb-3">
                ← Todas las categorías
              </button>
              <h3 className="font-bold text-brand-700 mb-2">{selectedCategory.name}</h3>
              {FOOD_CATS.includes(selectedCategory.name) ? (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[420px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-bold uppercase tracking-widest text-ink-400 pb-2 pr-3 w-1/4"></th>
                        {columns.map(col => (
                          <th key={col} className="text-center text-xs font-bold uppercase tracking-widest text-brand-600 pb-2 px-1">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCategory.items.map(item => (
                        <tr key={item.id} className="border-t border-cream-200">
                          <td className="py-2 pr-3">
                            <div className="font-bold text-ink-900 text-sm">{item.name}</div>
                            <div className="text-brand-600 font-extrabold text-xs mt-0.5">{formatPrice(item.price)}</div>
                          </td>
                          {columns.map(col => {
                            const qty = getQty(item.id, col);
                            return (
                              <td key={col} className="py-1.5 px-1 text-center">
                                <div className="inline-flex items-center gap-1 bg-cream-50 rounded-lg border border-ink-200 px-1 py-0.5">
                                  <button onClick={() => updateQty(item.id, -1, col)} className="w-6 h-6 rounded-md bg-white text-ink-700 font-bold text-xs hover:bg-cream-100 transition flex items-center justify-center">−</button>
                                  <span className="w-5 text-center font-bold text-ink-900 text-xs">{qty}</span>
                                  <button onClick={() => addItem(item, col)} className="w-6 h-6 rounded-md bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition flex items-center justify-center">+</button>
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
                <div className="flex flex-col gap-2">
                  {selectedCategory.items.map(item => {
                    const qty = getQty(item.id, '');
                    return (
                      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-ink-900/5 p-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-ink-900 text-sm">{item.name}</div>
                          <div className="text-brand-600 font-extrabold text-xs">{formatPrice(item.price)}</div>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-cream-50 rounded-lg border border-ink-200 px-1.5 py-1">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-md bg-white text-ink-700 font-bold text-sm hover:bg-cream-100 transition flex items-center justify-center">−</button>
                          <span className="w-5 text-center font-bold text-ink-900 text-sm">{qty}</span>
                          <button onClick={() => addItem(item)} className="w-7 h-7 rounded-md bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition flex items-center justify-center">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {menuData.filter(cat => cat.items.length > 0).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="card-glow bg-white rounded-xl shadow-sm border border-ink-900/5 p-5 text-center hover:border-brand-400 hover:shadow-lg transition"
                >
                  <h3 className="font-bold text-ink-900">{cat.name}</h3>
                  <p className="text-brand-500 text-xs font-bold uppercase tracking-wider mt-1">{cat.items.length} platillos</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div id="cart-section" className="bg-white p-4 rounded-xl shadow-md lg:sticky lg:top-20 scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">Carrito</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Selecciona productos del menú</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={`${item.menu_item_id}-${item.variant || ''}`} className="flex justify-between items-center py-2 border-b gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-sm text-gray-600">{formatPrice(item.price)} c/u</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQty(item.menu_item_id, -1, item.variant)} className="w-9 h-9 bg-gray-100 rounded-full font-bold">-</button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1, item.variant)} className="w-9 h-9 bg-gray-100 rounded-full font-bold">+</button>
                    <span className="w-20 text-right font-bold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button onClick={handleSubmit} disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
                {loading ? 'Creando...' : 'Crear Orden'}
              </button>
            </>
          )}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white border-t border-ink-100 shadow-2xl flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-ink-400 font-semibold uppercase tracking-wider">{cartCount} producto{cartCount !== 1 ? 's' : ''}</div>
            <div className="font-black text-lg text-ink-900">{formatPrice(total)}</div>
          </div>
          <button onClick={() => document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-500 text-white px-5 py-3 rounded-lg font-bold text-sm hover:bg-brand-600 transition">Ver Carrito →</button>
        </div>
      )}
    </div>
  );
}
