import { useState, useEffect } from 'react';
import { orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';
import SplitBill from './SplitBill';
import { printTicket } from '../lib/print';

export default function CobroModal({ order, onClose, onPaid }) {
  const [metodo, setMetodo] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [cambio, setCambio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [splitMode, setSplitMode] = useState(null);
  const [payments, setPayments] = useState([]);
  const [partialMode, setPartialMode] = useState(false);

  const total = order?.total || 0;
  const items = order?.items || [];

  useEffect(() => {
    if (order) ordersApi.getPayments(order.id).then(d => setPayments(d.payments)).catch(() => {});
  }, [order]);

  const alreadyPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - alreadyPaid;

  const handleSplit = (split) => {
    setSplitMode(split);
    setPartialMode(true);
    setMetodo(null);
    setRecibido('');
    setCambio(null);
    setError('');
  };

  const handlePago = async () => {
    if (!metodo) return;
    const amount = partialMode ? remaining : total;
    if (metodo === 'efectivo') {
      const r = parseFloat(recibido);
      if (!r || r < amount) { setError('La cantidad no cubre el monto'); return; }
    }
    setLoading(true);
    setError('');
    try {
      await ordersApi.addPayment(order.id, { amount, method: metodo, person_name: null });
      const upd = await ordersApi.getPayments(order.id);
      setPayments(upd.payments);
      if (upd.payments.reduce((s, p) => s + p.amount, 0) >= total) {
        onPaid(order.id);
        onClose();
      } else {
        setMetodo(null);
        setRecibido('');
        setCambio(null);
        setError('Pago registrado. Restan: ' + formatPrice(upd.remaining));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectMetodo = (m) => {
    setMetodo(m);
    setRecibido('');
    setCambio(null);
    setError('');
  };

  const calcCambio = (val) => {
    const r = parseFloat(val) || 0;
    setRecibido(val);
    const amount = partialMode ? remaining : total;
    if (r >= amount) setCambio(r - amount);
    else setCambio(null);
  };

  if (!order) return null;

  const amount = partialMode ? remaining : total;
  const puedePagar = metodo === 'tarjeta' || (metodo === 'efectivo' && parseFloat(recibido) >= amount);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-cream-50 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-cream-50 z-10 border-b border-ink-200 px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Cobrar</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order info */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-ink-900">#{order.id}</span>
              {order.mesa && <span className="text-sm text-ink-500 font-medium">{order.mesa}</span>}
            </div>
            <div className="text-sm text-ink-700 font-medium mb-3">{order.customer_name}</div>
            <div className="space-y-1 text-sm">
              {items.map(item => (
                <div key={item.id}>
                  <div className="flex justify-between">
                    <span className="text-ink-600">{item.quantity}x {item.name}</span>
                    <span className="text-ink-500">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  {item.notes && <div className="text-xs text-yellow-600 ml-2">📝 {item.notes}</div>}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-ink-100 text-lg font-bold">
              <span className="text-ink-900">Total</span>
              <span className="text-brand-600">{formatPrice(total)}</span>
            </div>
            {payments.length > 0 && (
              <div className="mt-2 space-y-1 text-xs">
                {payments.map((p, i) => (
                  <div key={p.id} className="flex justify-between text-ink-400">
                    <span>#{i + 1} {p.person_name || p.method} — {p.method}</span>
                    <span>{formatPrice(p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-ink-600 border-t border-ink-100 pt-1">
                  <span>Pagado</span><span>{formatPrice(alreadyPaid)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between font-bold text-red-500">
                    <span>Restante</span><span>{formatPrice(remaining)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Split bill section */}
          {remaining > 0 && !splitMode && !partialMode && (
            <SplitBill items={items} total={total} onSplit={handleSplit} onCancel={() => {}} />
          )}

          {/* Split summary */}
          {splitMode && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-800">
                  {splitMode.mode === 'equal' ? `👥 ${splitMode.count} personas` : '📋 Por producto'}
                </span>
                <button onClick={() => { setSplitMode(null); setPartialMode(false); }} className="text-xs text-ink-400">Quitar división</button>
              </div>
              {splitMode.mode === 'items' && splitMode.people.map((p, i) => (
                <div key={i} className="flex justify-between text-ink-600"><span>{p.name}</span><span className="font-semibold">{formatPrice(p.subtotal)}</span></div>
              ))}
              {splitMode.mode === 'equal' && <div className="text-ink-600">{splitMode.count} personas × {formatPrice(splitMode.each)}</div>}
              <div className="flex justify-between font-bold text-brand-800 border-t border-brand-200 pt-1 mt-1">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>
          )}

          {/* Payment method */}
          {remaining > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">{partialMode ? `Cobrar ${formatPrice(amount)}` : 'Método de pago'}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => selectMetodo('efectivo')}
                  className={`p-4 rounded-xl border-2 text-center transition font-bold text-sm ${metodo === 'efectivo' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'}`}>
                  <div className="text-2xl mb-1">💵</div> Efectivo
                </button>
                <button onClick={() => selectMetodo('tarjeta')}
                  className={`p-4 rounded-xl border-2 text-center transition font-bold text-sm ${metodo === 'tarjeta' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'}`}>
                  <div className="text-2xl mb-1">💳</div> Tarjeta
                </button>
              </div>
            </div>
          )}

          {/* Efectivo panel */}
          {metodo === 'efectivo' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-500">¿Con cuánto paga?</div>
              <div className="flex gap-2">
                {[amount, 100, 200, 500].map(val => (
                  <button key={val} onClick={() => {
                    const v = val === amount ? amount : val;
                    document.getElementById('monto-recibido').value = v;
                    calcCambio(v);
                  }}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold font-display text-sm transition ${parseFloat(recibido) === val ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'}`}>
                    {val === amount ? 'Exacto' : `$${val}`}
                  </button>
                ))}
              </div>
              <input id="monto-recibido" type="number" inputMode="decimal" placeholder="Otra cantidad"
                onChange={e => calcCambio(e.target.value)}
                className="w-full p-3 border border-ink-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
              {recibido && (
                <div className={`p-3 rounded-xl text-center font-display text-lg font-bold ${cambio !== null ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {cambio !== null ? `Cambio: ${formatPrice(cambio)}` : `Faltan: ${formatPrice(amount - parseFloat(recibido))}`}
                </div>
              )}
            </div>
          )}

          {/* Tarjeta panel */}
          {metodo === 'tarjeta' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              💳 Cobra <strong>{formatPrice(amount)}</strong> en la terminal y confirma aquí.
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

          {remaining > 0 && (
            <button onClick={handlePago} disabled={!puedePagar || loading}
              className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition disabled:opacity-40">
              {loading ? 'Procesando…' : `${partialMode ? `Registrar pago ${formatPrice(amount)}` : `Cobrar ${formatPrice(total)}`}`}
            </button>
          )}

          {remaining <= 0 && (
            <div>
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-center font-bold text-sm mb-3">
                ✅ Total pagado ({payments.length} pago{payments.length !== 1 ? 's' : ''})
              </div>
              <div className="flex gap-2">
                <button onClick={() => printTicket({ type: 'recibo', order, items, payments, cambio: null, subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0), discount: order.discount })}
                  className="flex-1 border-2 border-brand-500 text-brand-600 py-3 rounded-xl font-bold text-sm hover:bg-brand-50 transition">Imprimir Recibo</button>
                <button onClick={() => printTicket({ type: 'comanda', order, items })}
                  className="flex-1 border-2 border-ink-200 text-ink-600 py-3 rounded-xl font-bold text-sm hover:bg-ink-50 transition">Imprimir Comanda</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
