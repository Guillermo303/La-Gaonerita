import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { menu as menuApi, orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';

export default function OrderLocal() {
  const [menuData, setMenuData] = useState([]);
  const [cart, setCart] = useState([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { menuApi.getAll().then(setMenuData).catch(console.error); }, []);

  const addItem = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.flatMap(i => {
      if (i.menu_item_id !== id) return [i];
      const q = i.quantity + delta;
      return q <= 0 ? [] : [{ ...i, quantity: q }];
    }));
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Escribe tu nombre'); return; }
    if (cart.length === 0) { setError('Agrega al menos un producto'); return; }
    setPlacing(true);
    setError('');
    try {
      const order = await ordersApi.create({
        customer_name: name.trim(),
        order_type: 'local',
        notes: notes.trim() || null,
        payment_method: 'efectivo',
        items: cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }))
      });
      setCart([]);
      setPlaced(order);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="text-7xl mb-4">🌮</div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-2">¡Pedido Recibido!</h1>
          <p className="text-ink-500 mb-1">Tu orden <span className="font-bold text-brand-600 text-2xl">#{placed.id}</span></p>
          <p className="text-sm text-ink-400 mb-6">Prepárate para pasar a caja cuando te llamemos</p>
          <div className="bg-cream-50 rounded-xl p-4 mb-6 text-left space-y-1">
            {placed.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-ink-700">{item.quantity}x {item.name}</span>
                <span className="text-ink-500">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-cream-200 pt-2 flex justify-between font-bold text-ink-900">
              <span>Total</span>
              <span className="text-brand-600">{formatPrice(placed.total)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => { setPlaced(null); setName(''); setNotes(''); }} className="bg-brand-500 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Hacer otro pedido</button>
            <Link to="/menu" className="text-ink-500 text-sm hover:underline">Ver menú completo</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏠</div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Pedir desde el Local</h1>
          <p className="text-ink-400 mt-1">Elige tus tacos y te los preparamos al momento</p>
        </div>

        {error && <div className="bg-brand-50 border border-brand-200 text-brand-700 p-3 rounded-lg mb-6 max-w-md mx-auto text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-10">
          <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Tu nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Juan" className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-lg" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Notas <span className="normal-case font-normal text-ink-300">(opcional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" placeholder="Sin cebolla, salsa aparte…" className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
        </form>

        <div className="space-y-8">
          {menuData.map(cat => (
            <div key={cat.id}>
              <h2 className="font-display text-2xl font-bold text-brand-600 mb-1">{cat.name}</h2>
              {cat.description && <p className="text-ink-400 text-sm mb-4">{cat.description}</p>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.items.map(item => {
                  const inCart = cart.find(i => i.menu_item_id === item.id);
                  return (
                    <div key={item.id} className={`bg-white rounded-xl p-4 shadow-sm border transition ${inCart ? 'border-brand-400 ring-1 ring-brand-400' : 'border-ink-900/5 hover:shadow-md'}`}>
                      <div className="flex items-baseline justify-between gap-2 mb-3">
                        <h3 className="font-display font-bold text-ink-900">{item.name}</h3>
                        <span className="text-brand-600 font-extrabold whitespace-nowrap">{formatPrice(item.price)}</span>
                      </div>
                      {inCart ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-full bg-cream-100 text-ink-700 font-bold text-lg hover:bg-cream-200 transition">−</button>
                            <span className="w-6 text-center font-bold text-ink-900">{inCart.quantity}</span>
                            <button type="button" onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 transition">+</button>
                          </div>
                          <span className="text-sm font-semibold text-ink-500">{formatPrice(item.price * inCart.quantity)}</span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => addItem(item)} className="w-full bg-cream-100 text-brand-700 py-2 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-brand-500 hover:text-white transition">Agregar +</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {count > 0 && (
          <div className="fixed bottom-4 inset-x-4 z-40 flex justify-center">
            <button onClick={handleSubmit} disabled={placing}
              className="flex items-center justify-between gap-6 w-full max-w-xl bg-ink-900 text-cream-50 rounded-full shadow-2xl px-6 py-4 hover:bg-ink-800 transition disabled:opacity-60">
              <span className="flex items-center gap-3">
                <span className="bg-brand-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{count}</span>
                <span className="font-semibold">{count === 1 ? '1 producto' : `${count} productos`}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-extrabold text-lg">{formatPrice(total)}</span>
                <span className="text-brand-300 font-bold uppercase tracking-wider text-sm">{placing ? 'Enviando…' : 'Pedir →'}</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
