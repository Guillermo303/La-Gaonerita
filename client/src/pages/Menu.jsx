import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { menu as menuApi, customizations as customizationsApi, orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Reveal from '../components/Reveal';

function LoDeSiempre({ items, add, inCart, updateQty }) {
  if (!items.length) return null;

  return (
    <Reveal className="mb-10">
      <div className="bg-brand-50 rounded-2xl shadow-sm border border-brand-200 p-6">
        <h2 className="font-display text-lg font-bold text-brand-700 mb-1">¿Lo de siempre? 👋</h2>
        <p className="text-sm text-brand-600/80 mb-4">Basado en lo que más pides</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {items.map(item => {
            const cartItem = inCart(item.id);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-brand-100 p-4 flex flex-col">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-ink-900 text-sm">{item.name}</h3>
                  <span className="text-brand-600 font-extrabold text-sm whitespace-nowrap">{formatPrice(item.price)}</span>
                </div>
                {cartItem ? (
                  <div className="flex items-center justify-between mt-auto">
                    <button onClick={() => updateQty(item.id, -1)} aria-label={`Quitar un ${item.name}`} className="w-8 h-8 rounded-full bg-cream-100 text-ink-700 font-bold hover:bg-cream-200 transition">−</button>
                    <span className="font-bold text-ink-900">{cartItem.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} aria-label={`Agregar otro ${item.name}`} className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold hover:bg-brand-600 transition">+</button>
                  </div>
                ) : (
                  <button onClick={() => add(item)} className="mt-auto w-full bg-brand-500 text-white py-2 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-brand-600 transition">Agregar +</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}

function PersonalizaTuPedido({ groups, customizations, setCustomizations }) {
  if (!groups.length) return null;

  const selectSingle = (groupName, optionName) => {
    setCustomizations(prev => ({ ...prev, [groupName]: optionName }));
  };

  const toggleMultiple = (groupName, optionName) => {
    setCustomizations(prev => {
      const current = prev[groupName] || [];
      const next = current.includes(optionName) ? current.filter(o => o !== optionName) : [...current, optionName];
      return { ...prev, [groupName]: next };
    });
  };

  return (
    <Reveal className="mb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-ink-900/5 p-6">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Personaliza tu pedido</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {groups.map(group => (
            <div key={group.id}>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map(option => {
                  const isMultiple = group.selection_type === 'multiple';
                  const selected = isMultiple
                    ? (customizations[group.name] || []).includes(option.name)
                    : customizations[group.name] === option.name;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => isMultiple ? toggleMultiple(group.name, option.name) : selectSingle(group.name, option.name)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${selected ? 'bg-brand-500 text-white border-brand-500' : 'bg-cream-50 text-ink-600 border-ink-200 hover:border-brand-300'}`}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export default function Menu() {
  const [menuData, setMenuData] = useState([]);
  const [customizationGroups, setCustomizationGroups] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { items, add, updateQty, count, total, customizations, setCustomizations } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    menuApi.getAll().then(setMenuData).catch(console.error).finally(() => setLoading(false));
    customizationsApi.getAll().then(setCustomizationGroups).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) { setRecommendations([]); return; }
    ordersApi.getRecommendations()
      .then(res => setRecommendations(res.eligible ? res.items : []))
      .catch(() => setRecommendations([]));
  }, [user]);

  const inCart = (id) => items.find(i => i.menu_item_id === id);

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
      <LoDeSiempre items={recommendations} add={add} inCart={inCart} updateQty={updateQty} />
      <PersonalizaTuPedido groups={customizationGroups} customizations={customizations} setCustomizations={setCustomizations} />
      {menuData.filter(cat => cat.items.length > 0).map(cat => (
        <Reveal key={cat.id} className="mb-14">
          <div className="flex items-baseline gap-4 mb-6">
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-brand-600">{cat.name}</h2>
            <div className="flex-1 border-b-2 border-dotted border-ink-200" />
          </div>
          {cat.description && <p className="text-ink-400 -mt-3 mb-6">{cat.description}</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.items.map(item => {
              const cartItem = inCart(item.id);
              const stock = item.stock ?? 20;
              const agotado = stock <= 0;
              const pocasUnidades = !agotado && stock <= 5;
              const alTope = cartItem && cartItem.quantity >= stock;
              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition ${agotado ? 'opacity-60' : ''} ${cartItem ? 'border-brand-400 ring-1 ring-brand-400' : 'border-ink-900/5'}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-ink-900">{item.name}</h3>
                    <span className="text-brand-600 font-extrabold whitespace-nowrap">{formatPrice(item.price)}</span>
                  </div>
                  {item.ready_to_serve ? <p className="text-brand-500 text-xs font-bold uppercase tracking-wider mt-1">⚡ Listo al instante</p> : null}
                  {item.description && <p className="text-ink-400 text-sm mt-2 leading-relaxed">{item.description}</p>}
                  {agotado && <p className="text-red-500 text-xs font-bold uppercase tracking-wider mt-2">Agotado por hoy</p>}
                  {pocasUnidades && <p className="text-yellow-600 text-xs font-bold uppercase tracking-wider mt-2">¡Últimas {stock}!</p>}
                  <div className="mt-4">
                    {cartItem ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQty(item.id, -1)} aria-label={`Quitar un ${item.name}`} className="w-9 h-9 rounded-full bg-cream-100 text-ink-700 font-bold text-lg hover:bg-cream-200 transition">−</button>
                          <span className="w-6 text-center font-bold text-ink-900">{cartItem.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} disabled={alTope} aria-label={`Agregar otro ${item.name}`} className="w-9 h-9 rounded-full bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 transition disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                        </div>
                        <span className="text-sm font-semibold text-ink-500">{formatPrice(item.price * cartItem.quantity)}</span>
                      </div>
                    ) : (
                      <button onClick={() => add(item)} disabled={agotado} className="w-full bg-cream-100 text-brand-700 py-2 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-brand-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cream-100 disabled:hover:text-brand-700">
                        {agotado ? 'Agotado' : 'Agregar +'}
                      </button>
                    )}
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
              <span className="font-extrabold text-lg">{formatPrice(total)}</span>
              <span className="text-brand-300 font-bold uppercase tracking-wider text-sm">Hacer Pedido →</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
