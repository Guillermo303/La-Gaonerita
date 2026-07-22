import { useState, useEffect } from 'react';
import { menu as menuApi, orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';

export default function QuickSaleModal({ onClose, onCreated }) {
  const [menuData, setMenuData] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Mostrador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { menuApi.getAll().then(setMenuData).catch(() => setError('No se pudo cargar el menú')); }, []);

  const readyItems = menuData.flatMap(cat => cat.items.filter(i => i.ready_to_serve));

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

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const submit = async () => {
    if (!cart.length) return;
    setLoading(true);
    setError('');
    try {
      const order = await ordersApi.create({
        customer_name: customerName.trim() || 'Mostrador',
        order_type: 'local',
        quick_sale: true,
        items: cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }))
      });
      onCreated(order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-cream-50 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-cream-50 z-10 border-b border-ink-200 px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">⚡ Venta Rápida</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
          <p className="text-xs text-ink-400">Solo productos marcados como venta rápida (⚡) — no pasan por cocina, se cobran de inmediato.</p>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Cliente / Mostrador" className="w-full p-2.5 border border-ink-200 rounded-lg text-sm" />

          {readyItems.length === 0 ? (
            <div className="text-center py-8 text-ink-400 text-sm">No hay productos marcados como venta rápida. Márcalos con ⚡ desde la pestaña Menú.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {readyItems.map(item => (
                <button key={item.id} onClick={() => addItem(item)} className="bg-white p-3 rounded-lg shadow-sm text-left hover:bg-brand-50 transition border border-ink-100">
                  <div className="font-semibold text-sm text-ink-900">{item.name}</div>
                  <div className="text-brand-600 text-sm font-bold">{formatPrice(item.price)}</div>
                </button>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="bg-white rounded-xl p-3 shadow-sm space-y-1">
              {cart.map(item => (
                <div key={item.menu_item_id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-ink-800">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.menu_item_id, -1)} className="w-6 h-6 bg-cream-100 rounded-full text-sm">−</button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1)} className="w-6 h-6 bg-brand-500 text-white rounded-full text-sm">+</button>
                    <span className="w-16 text-right text-sm font-bold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-ink-100 font-bold">
                <span>Total</span>
                <span className="text-brand-600">{formatPrice(total)}</span>
              </div>
            </div>
          )}

          <button onClick={submit} disabled={!cart.length || loading} className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition disabled:opacity-40">
            {loading ? 'Creando…' : `Continuar a cobro · ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
