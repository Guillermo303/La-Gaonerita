import { useState, useEffect } from 'react';
import { menu as menuApi, orders as ordersApi, pos as posApi } from '../api';
import { formatPrice } from '../lib/utils';
import SplitBill from '../components/SplitBill';
import { printTicket } from '../lib/print';

export default function POS() {
  const [menuData, setMenuData] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', type: 'local', mesa: '' });
  const [payment, setPayment] = useState('efectivo');
  const [recibido, setRecibido] = useState('');
  const [step, setStep] = useState('cart');
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [error, setError] = useState('');
  const [splitMode, setSplitMode] = useState(null);

  useEffect(() => { menuApi.getAll().then(setMenuData).catch(console.error); }, []);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const cambio = recibido ? parseFloat(recibido) - total : 0;

  const addItem = (item) => setCart(prev => {
    const ex = prev.find(i => i.menu_item_id === item.id);
    if (ex) return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
    return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }];
  });
  const updateQty = (id, d) => setCart(prev => prev.flatMap(i => i.menu_item_id === id ? (i.quantity + d <= 0 ? [] : [{ ...i, quantity: i.quantity + d }]) : [i]));
  const updateNotes = (id, notes) => setCart(prev => prev.map(i => i.menu_item_id === id ? { ...i, notes } : i));

  const handleSubmit = async () => {
    if (!customer.name || cart.length === 0) { setError('Nombre y al menos un producto requerido'); return; }
    if (payment === 'efectivo' && recibido && parseFloat(recibido) < total) { setError('La cantidad no cubre el total'); return; }
    setLoading(true); setError('');
    try {
      const order = await ordersApi.create({
        customer_name: customer.name,
        customer_phone: customer.phone || null,
        order_type: customer.type,
        mesa: customer.type === 'local' ? customer.mesa || null : null,
        notes: null,
        payment_method: payment,
        items: cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: i.notes || null }))
      });
      if (payment !== 'efectivo' || (recibido && parseFloat(recibido) >= total)) {
        await ordersApi.updatePayment(order.id, 'pagado').catch(() => {});
        order.payment_status = 'pagado';
      }
      setPlaced({ ...order, cambio: payment === 'efectivo' && recibido && parseFloat(recibido) >= total ? parseFloat(recibido) - total : 0, recibido });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  if (placed) return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">{placed.payment_status === 'pagado' ? '✅' : '📋'}</div>
        <h1 className="text-2xl font-black font-display text-ink-900 mb-1">Venta Completada</h1>
        <p className="text-ink-400 text-sm mb-4">Orden #{placed.id}</p>
        <div className="bg-cream-50 rounded-xl p-4 text-left space-y-1 mb-4">
          {placed.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-brand-600">{formatPrice(placed.total)}</span></div>
          {placed.cambio > 0 && <div className="flex justify-between text-sm text-green-600"><span>Cambio</span><span>{formatPrice(placed.cambio)}</span></div>}
        </div>
        <div className="flex gap-2 mb-2">
          <button onClick={() => printTicket({ type: 'recibo', order: placed, items: placed.items || cart, cambio: placed.cambio })}
            className="flex-1 border-2 border-brand-500 text-brand-600 py-3 rounded-xl font-bold text-sm hover:bg-brand-50 transition">Imprimir Recibo</button>
          <button onClick={() => printTicket({ type: 'comanda', order: placed, items: placed.items || cart })}
            className="flex-1 border-2 border-ink-200 text-ink-600 py-3 rounded-xl font-bold text-sm hover:bg-ink-50 transition">Imprimir Comanda</button>
        </div>
        <button onClick={() => { setCart([]); setCustomer({ name: '', phone: '', type: 'local', mesa: '' }); setRecibido(''); setPlaced(null); setStep('cart'); }} className="bg-brand-500 text-white w-full py-3 rounded-xl font-bold hover:bg-brand-600 transition">Nueva Venta</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="bg-ink-900 text-cream-50 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <h1 className="font-black font-display text-lg">🏪 POS</h1>
          {step === 'cart' && <span className="text-sm text-cream-100/50">{count} productos · {formatPrice(total)}</span>}
        </div>
        <div className="flex gap-2">
          {step === 'payment' && <button onClick={() => setStep('cart')} className="text-xs text-cream-100/70 hover:text-white">← Atrás</button>}
          {step === 'cart' && count > 0 && <button onClick={() => setStep('payment')} className="bg-brand-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-brand-600">Cobrar</button>}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 text-sm text-center">{error}</div>}

      {step === 'cart' && (
        <div className="flex flex-col lg:flex-row max-w-7xl mx-auto">
          {/* Products */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {menuData.map(cat => cat.items.map(item => (
                <button key={item.id} onClick={() => addItem(item)} className="bg-white rounded-xl shadow-sm border border-ink-100 text-left hover:border-brand-400 hover:shadow transition text-sm overflow-hidden">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-20 object-cover" loading="lazy" />}
                  <div className="p-2.5">
                    <div className="font-bold text-ink-900 truncate">{item.name}</div>
                    <div className="text-brand-600 font-bold mt-0.5">{item.price > 0 ? formatPrice(item.price) : 'Gratis'}</div>
                  </div>
                </button>
              )))}
            </div>
          </div>

          {/* Cart sidebar */}
          <div className="w-full lg:w-96 bg-white border-l border-ink-200 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-400">Cliente</div>
            <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Nombre del cliente" className="w-full p-2 border border-ink-200 rounded-lg text-sm" />
            <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="Teléfono" className="w-full p-2 border border-ink-200 rounded-lg text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setCustomer({ ...customer, type: 'local' })} className={`flex-1 p-2 rounded-lg text-xs font-bold ${customer.type === 'local' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'}`}>Local</button>
              <button onClick={() => setCustomer({ ...customer, type: 'domicilio' })} className={`flex-1 p-2 rounded-lg text-xs font-bold ${customer.type === 'domicilio' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600'}`}>Domicilio</button>
            </div>
            {customer.type === 'local' && <input value={customer.mesa} onChange={e => setCustomer({ ...customer, mesa: e.target.value })} placeholder="Mesa (opcional)" className="w-full p-2 border border-ink-200 rounded-lg text-sm" />}

            <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mt-3">Productos</div>
            {cart.length === 0 ? <p className="text-xs text-ink-300 text-center py-4">Toca un producto para agregarlo</p> : cart.map(item => (
              <div key={item.menu_item_id} className="border-b border-ink-100 pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.menu_item_id, -1)} className="w-6 h-6 rounded-full bg-ink-100 text-xs font-bold">−</button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1)} className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">+</button>
                  </div>
                </div>
                <input value={item.notes} onChange={e => updateNotes(item.menu_item_id, e.target.value)} placeholder="Nota" className="w-full text-xs border border-ink-100 rounded mt-1 p-1" />
              </div>
            ))}
            {cart.length > 0 && (
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span className="text-brand-600">{formatPrice(total)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-center">Cobrar {formatPrice(total)}</h2>
            <div className="text-sm text-ink-500 text-center">{customer.name} · {customer.type === 'local' ? '🏠 Local' : '🛵 Domicilio'}{customer.mesa && ` · ${customer.mesa}`}</div>
            <div className="space-y-1 text-sm">{cart.map(item => <div key={item.menu_item_id} className="flex justify-between"><span>{item.quantity}x {item.name}</span><span>{formatPrice(item.price * item.quantity)}</span></div>)}</div>

            {/* Split bill in POS */}
            {splitMode && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-brand-800">
                    {splitMode.mode === 'equal' ? `👥 ${splitMode.count} personas` : '📋 Por producto'}
                  </span>
                  <button onClick={() => setSplitMode(null)} className="text-xs text-ink-400">Quitar</button>
                </div>
                {splitMode.mode === 'equal' && <div className="text-ink-600">{splitMode.count} × {formatPrice(splitMode.each)}</div>}
                {splitMode.mode === 'items' && splitMode.people.map((p, i) => (
                  <div key={i} className="flex justify-between text-ink-600"><span>{p.name}</span><span className="font-semibold">{formatPrice(p.subtotal)}</span></div>
                ))}
              </div>
            )}
            {!splitMode && (
              <SplitBill
                items={cart.map(i => ({ id: i.menu_item_id, name: i.name, quantity: i.quantity, price: i.price }))}
                total={total}
                onSplit={setSplitMode}
                onCancel={() => {}}
              />
            )}

            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Método de pago</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPayment('efectivo')} className={`p-3 rounded-xl border-2 text-center font-bold ${payment === 'efectivo' ? 'border-brand-500 bg-brand-50' : 'border-ink-200'}`}>💵 Efectivo</button>
                <button onClick={() => setPayment('tarjeta')} className={`p-3 rounded-xl border-2 text-center font-bold ${payment === 'tarjeta' ? 'border-brand-500 bg-brand-50' : 'border-ink-200'}`}>💳 Tarjeta</button>
              </div>
            </div>
            {payment === 'efectivo' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[total, 100, 200, 500].map(v => <button key={v} onClick={() => setRecibido(v)} className={`flex-1 p-2 rounded-xl border-2 text-sm font-bold ${parseFloat(recibido) === v ? 'border-brand-500 bg-brand-50' : 'border-ink-200'}`}>{v === total ? 'Exacto' : `$${v}`}</button>)}
                </div>
                <input type="number" value={recibido} onChange={e => setRecibido(e.target.value)} placeholder="Otra cantidad" className="w-full p-3 border border-ink-200 rounded-xl text-lg font-bold text-center" />
                {recibido && (
                  <div className={`p-3 rounded-xl text-center font-bold ${cambio >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {cambio >= 0 ? `Cambio: ${formatPrice(cambio)}` : `Faltan: ${formatPrice(Math.abs(cambio))}`}
                  </div>
                )}
              </div>
            )}
            {payment === 'tarjeta' && <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 text-center">💳 Cobra en la terminal y confirma</div>}
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 disabled:opacity-50">{loading ? 'Procesando…' : `Completar Venta · ${formatPrice(total)}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
