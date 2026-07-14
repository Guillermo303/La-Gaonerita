import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { menu as menuApi, promotions as promoApi } from '../api';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import Reveal from '../components/Reveal';
import PromoBanner from '../components/PromoBanner';

export default function Menu() {
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePromos, setActivePromos] = useState([]);
  const { items, add, updateQty, updateNotes, count, subtotal, discount, finalTotal, promotion, setPromotion } = useCart();

  useEffect(() => {
    menuApi.getAll().then(setMenuData).catch(console.error).finally(() => setLoading(false));
    promoApi.getActive().then(setActivePromos).catch(() => {});
  }, []);

  const inCart = (id) => items.find(i => i.menu_item_id === id);

  const togglePromo = (p) => {
    setPromotion(promotion?.id === p.id ? null : p);
  };

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-14 pb-32">
      <div className="text-center mb-14">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">Hecho al momento</p>
        <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-ink-900">Nuestro Menú</h1>
        <div className="flex items-center justify-center gap-3 mt-4" aria-hidden="true">
          <span className="h-px w-12 bg-brand-400" />
          <span className="text-brand-500">✦</span>
          <span className="h-px w-12 bg-brand-400" />
        </div>
        <p className="text-ink-400 mt-4">Elige tus platillos y haz tu pedido a domicilio o para recoger en sucursal.</p>
      </div>

      <PromoBanner />

      {activePromos.length > 0 && count > 0 && (
        <div className="mb-8 bg-cream-50 border border-brand-200 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-500">Promociones disponibles</div>
          {activePromos.map(p => {
            const selected = promotion?.id === p.id;
            return (
              <button key={p.id} onClick={() => togglePromo(p)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${selected ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300'}`}>
                <div><div className="font-bold text-sm text-ink-900">{p.name}</div><div className="text-xs text-ink-400">{p.description}</div></div>
                <div className="text-right">
                  <div className={`text-lg font-black ${selected ? 'text-brand-600' : 'text-green-600'}`}>{p.discount_type === 'percentage' ? `${p.discount_value}%` : `-${formatPrice(p.discount_value)}`}</div>
                  {selected && discount > 0 && <div className="text-xs text-green-600 font-bold">-{formatPrice(discount)}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {menuData.map(cat => (
        <Reveal key={cat.id} className="mb-14">
          <div className="flex items-baseline gap-4 mb-6">
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-brand-600">{cat.name}</h2>
            <div className="flex-1 border-b-2 border-dotted border-ink-200" />
          </div>
          {cat.description && <p className="text-ink-400 -mt-3 mb-6">{cat.description}</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.items.map(item => {
              const cartItem = inCart(item.id);
              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition ${cartItem ? 'border-brand-400 ring-1 ring-brand-400' : 'border-ink-900/5'}`}>
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-36 object-cover" loading="lazy" />}
                  <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-ink-900">{item.name}</h3>
                    <span className="text-brand-600 font-extrabold whitespace-nowrap">{item.price > 0 ? formatPrice(item.price) : 'Gratis'}</span>
                  </div>
                  {item.description && <p className="text-ink-400 text-sm mt-2 leading-relaxed">{item.description}</p>}
                  <div className="mt-4">
                    {cartItem ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateQty(item.id, -1)} aria-label={`Quitar un ${item.name}`} className="w-9 h-9 rounded-full bg-cream-100 text-ink-700 font-bold text-lg hover:bg-cream-200 transition">−</button>
                            <span className="w-6 text-center font-bold text-ink-900">{cartItem.quantity}</span>
                            <button onClick={() => updateQty(item.id, 1)} aria-label={`Agregar otro ${item.name}`} className="w-9 h-9 rounded-full bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 transition">+</button>
                          </div>
                          <span className="text-sm font-semibold text-ink-500">{item.price > 0 ? formatPrice(item.price * cartItem.quantity) : ''}</span>
                        </div>
                        <input value={cartItem.notes || ''} onChange={e => updateNotes(item.id, e.target.value)} placeholder="¿Alguna nota? (sin cebolla, etc.)" className="mt-2 w-full text-xs border border-ink-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                      </div>
                    ) : (
                      <button disabled={item.price === 0} onClick={() => add(item)} className="w-full bg-cream-100 text-brand-700 py-2 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-brand-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed">
                        {item.price > 0 ? 'Agregar +' : 'Incluido'}
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      ))}

      {count > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 flex justify-center">
          <Link to="/checkout" className="flex items-center justify-between gap-6 w-full max-w-xl bg-ink-900 text-cream-50 rounded-full shadow-2xl px-6 py-4 hover:bg-ink-800 transition">
            <span className="flex items-center gap-3">
              <span className="bg-brand-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{count}</span>
              <span className="font-semibold">{count === 1 ? '1 producto' : `${count} productos`}</span>
            </span>
            <span className="flex items-center gap-3">
              {discount > 0 && <span className="text-xs text-green-300 line-through">{formatPrice(subtotal)}</span>}
              <span className="font-extrabold text-lg">{formatPrice(finalTotal)}</span>
              <span className="text-brand-300 font-bold uppercase tracking-wider text-sm">Hacer Pedido →</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
