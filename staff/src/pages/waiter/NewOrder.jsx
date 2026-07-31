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

const STEPS = [
  { num: 1, label: 'Inicio' },
  { num: 2, label: 'Tipo' },
  { num: 3, label: 'Menú' },
  { num: 4, label: 'Conf.' },
  { num: 5, label: 'Listo' },
];

function StepBar({ current }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
            s.num < current ? 'bg-brand-500 text-white' : s.num === current ? 'bg-brand-500 text-white ring-2 ring-brand-200' : 'bg-cream-100 text-ink-400'
          }`}>
            {s.num < current ? '✓' : s.num}
          </div>
          {i < STEPS.length - 1 && <div className={`w-4 sm:w-8 h-0.5 ${s.num < current ? 'bg-brand-300' : 'bg-cream-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function NewOrder() {
  const [searchParams] = useSearchParams();
  const mesaParam = searchParams.get('mesa') || '';
  const [step, setStep] = useState(mesaParam ? 3 : 1);
  const [menuData] = useState(FALLBACK_MENU);
  const [columns] = useState(DEFAULT_COLUMNS);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState(mesaParam ? 'local' : '');
  const [mesa, setMesa] = useState(mesaParam);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', notes: '' });
  const [payment, setPayment] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(null);

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

  const reset = () => {
    setCart([]);
    setSelectedCategory(null);
    setCustomer({ name: '', phone: '', address: '', notes: '' });
    setPayment('efectivo');
    setPlaced(null);
    setError('');
    setStep(mesaParam ? 3 : 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!customer.name.trim()) { setError('Escribe el nombre del cliente'); return; }
    if (orderType === 'local' && !mesa) { setError('Selecciona una mesa'); return; }
    if (orderType === 'domicilio' && !customer.address.trim()) { setError('Escribe la dirección de entrega'); return; }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim() || null,
        customer_address: orderType === 'domicilio' ? customer.address.trim() : null,
        mesa: orderType === 'local' ? mesa : null,
        order_type: orderType || 'local',
        notes: customer.notes.trim() || null,
        payment_method: payment,
        items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, notes: i.variant || null }))
      });
      setPlaced(order);
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----- Paso 1: Inicio -----
  if (step === 1) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <StepBar current={1} />
        <div className="text-center">
          <div className="pop-in text-6xl mb-4">🌮</div>
          <h1 className="font-display text-4xl font-extrabold text-ink-900 mb-3">Nueva Orden</h1>
          <p className="text-ink-400 mb-10">Toma el pedido de tus clientes, igual que en la app de domicilio.</p>
          <button onClick={() => setStep(2)} className="btn-grow w-full bg-brand-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-brand-600 hover:shadow-xl transition">
            🛎️ Comenzar Pedido
          </button>
        </div>
      </div>
    );
  }

  // ----- Paso 2: Tipo -----
  if (step === 2) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <StepBar current={2} />
        <div className="text-center mb-8">
          <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">PASO 2 DE 5</p>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">¿Dónde se sirve?</h1>
        </div>
        <div className="flex flex-col gap-4">
          <button onClick={() => { setOrderType('local'); setStep(3); }}
            className="btn-grow bg-white border-2 border-ink-900/10 text-ink-900 py-6 rounded-2xl font-bold text-lg hover:border-brand-400 hover:shadow-lg transition flex items-center justify-center gap-3">
            <span className="text-3xl">🏪</span> En el local
          </button>
          <button onClick={() => { setOrderType('domicilio'); setMesa(''); setStep(3); }}
            className="btn-grow bg-brand-500 text-white py-6 rounded-2xl font-bold text-lg hover:bg-brand-600 hover:shadow-xl transition flex items-center justify-center gap-3">
            <span className="text-3xl">🛵</span> A domicilio
          </button>
        </div>
        <button onClick={() => { setStep(1); }} className="block w-full text-center text-sm text-brand-600 font-semibold hover:underline mt-6">← Atrás</button>
      </div>
    );
  }

  // ----- Paso 3: Menú -----
  if (step === 3) {
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
                              <button onClick={() => addItem(item, col)} className="w-7 h-7 rounded-md bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition flex items-center justify-center">+</button>
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
                      <button onClick={() => addItem(item)} className="w-7 h-7 rounded-md bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition flex items-center justify-center">+</button>
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
                {cartCount > 0 && (
                  <div className="flex items-center justify-between text-xs text-ink-300 mt-1">
                    <span>Total del pedido: {cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
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
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setStep(2)} className="shrink-0 px-4 py-2 rounded-full bg-white text-ink-700 font-bold text-sm border border-ink-200 shadow-sm hover:bg-cream-50 transition">
            ← Atrás
          </button>
          <div className="text-center flex-1">
            <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-1">PASO 3 DE 5</p>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900">Menú Principal</h1>
          </div>
          {orderType === 'local' && mesa && <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded-full shrink-0">{mesa}</span>}
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-6">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className="card-glow bg-white rounded-2xl shadow-sm border border-ink-900/5 p-8 text-center hover:border-brand-400 hover:shadow-lg transition group"
            >
              <h2 className="font-display text-2xl font-extrabold text-ink-900 group-hover:text-brand-600 transition">{cat.name}</h2>
              <p className="text-brand-500 text-xs font-bold uppercase tracking-wider mt-4">{cat.items.length} platillos</p>
            </button>
          ))}
        </div>

        <div className="fixed bottom-4 inset-x-4 z-40">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <button onClick={() => setStep(2)} className="shrink-0 px-5 py-4 rounded-full bg-white text-ink-700 font-bold text-sm border border-ink-200 shadow-lg hover:bg-cream-50 transition">
              ← Atrás
            </button>
            <button onClick={() => setStep(4)} disabled={cartCount === 0}
              className="btn-grow flex items-center justify-between gap-4 w-full bg-ink-900 text-cream-50 rounded-full shadow-2xl px-6 py-4 hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="flex items-center gap-3">
                <span className="bg-brand-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{cartCount}</span>
                <span className="font-semibold">{cartCount === 1 ? '1 producto' : `${cartCount} productos`}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-extrabold text-lg">{formatPrice(total)}</span>
                <span className="text-brand-300 font-bold uppercase tracking-wider text-sm">Confirmar →</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Paso 4: Confirmar -----
  if (step === 4) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-14">
        <StepBar current={4} />
        <div className="text-center mb-8">
          <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-1">PASO 4 DE 5</p>
          <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900">Confirmar Pedido</h1>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-6 max-w-2xl mx-auto">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-4xl mx-auto">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-display text-xl font-bold text-ink-900 mb-4">Productos ({cartCount})</h2>
              {cart.map(item => (
                <div key={`${item.menu_item_id}-${item.variant || ''}`} className="flex items-center justify-between py-2 border-b border-cream-200 last:border-0">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-800 truncate text-sm">{item.name}</div>
                    <div className="text-xs text-ink-400">{formatPrice(item.price)} c/u</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQty(item.menu_item_id, -1, item.variant)} className="w-7 h-7 rounded-full bg-cream-100 text-ink-700 font-bold text-xs hover:bg-cream-200 transition">−</button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1, item.variant)} className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition">+</button>
                    <span className="w-16 text-right font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-4 text-lg">
                <span className="font-bold text-ink-900">Total</span>
                <span className="font-extrabold text-brand-600">{formatPrice(total)}</span>
              </div>
              <button onClick={() => setStep(3)} className="block w-full text-center text-sm text-brand-600 font-semibold hover:underline mt-3">+ Agregar más productos</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Nombre del cliente</label>
                <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Nombre y apellido" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Teléfono</label>
                <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="55 1234 5678" />
              </div>
              {orderType === 'local' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Mesa</label>
                  <MesaSelector selected={mesa} onSelect={setMesa} showLabel={true} />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Dirección de entrega</label>
                  <textarea value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} rows="2"
                    className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Calle, número, colonia y referencias" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Notas para la cocina <span className="normal-case font-normal text-ink-300">(opcional)</span></label>
                <textarea value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} rows="2"
                  className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Sin cebolla, salsa aparte…" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Forma de pago</label>
                <select value={payment} onChange={e => setPayment(e.target.value)}
                  className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="flex-1 px-6 py-3.5 rounded-lg font-bold border border-ink-200 text-ink-600 hover:bg-cream-50 transition">
                  ← Atrás
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 btn-grow bg-brand-500 text-white py-3.5 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 disabled:opacity-50">
                  {loading ? 'Creando orden…' : `Crear Orden · ${formatPrice(total)}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ----- Paso 5: Listo -----
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <StepBar current={5} />
      <div className="pop-in text-6xl mb-4">✅</div>
      <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">¡Pedido creado!</h1>
      {placed && <p className="text-ink-500 mb-2">Orden <span className="font-bold text-brand-600">#{placed.id}</span> registrada.</p>}
      <p className="text-ink-400 text-sm mb-8">Enviada a cocina. Puedes ver su progreso desde el tablero.</p>
      <div className="flex flex-col gap-3">
        <button onClick={reset} className="w-full bg-brand-500 text-white py-3.5 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">
          Nueva Orden
        </button>
        <button onClick={() => navigate('/waiter')} className="w-full bg-ink-900 text-cream-50 py-3 rounded-lg font-bold text-sm hover:bg-ink-800 transition">
          Ver Pedidos
        </button>
      </div>
    </div>
  );
}
