import { useState } from 'react';
import { orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';

export default function CobroModal({ order, onClose, onPaid }) {
  const [metodo, setMetodo] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [cambio, setCambio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = order?.total || 0;

  const handlePago = async () => {
    if (!metodo) return;
    if (metodo === 'efectivo') {
      const r = parseFloat(recibido);
      if (!r || r < total) { setError('La cantidad no cubre el total'); return; }
    }
    setLoading(true);
    setError('');
    try {
      await ordersApi.updatePayment(order.id, 'pagado');
      onPaid(order.id);
      onClose();
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
    if (r >= total) setCambio(r - total);
    else setCambio(null);
  };

  if (!order) return null;

  const puedePagar = metodo === 'tarjeta' || (metodo === 'efectivo' && parseFloat(recibido) >= total);

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
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-ink-600">{item.quantity}x {item.name}</span>
                  <span className="text-ink-500">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-ink-100 text-lg font-bold">
              <span className="text-ink-900">Total</span>
              <span className="text-brand-600">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Método de pago</div>
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

          {/* Efectivo panel */}
          {metodo === 'efectivo' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-500">¿Con cuánto paga?</div>
              <div className="flex gap-2">
                {[total, 100, 200, 500].map(val => (
                  <button key={val} onClick={() => {
                    const v = val === total ? total : val;
                    document.getElementById('monto-recibido').value = v;
                    calcCambio(v);
                  }}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold font-display text-sm transition ${parseFloat(recibido) === val ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'}`}>
                    {val === total ? 'Exacto' : `$${val}`}
                  </button>
                ))}
              </div>
              <input id="monto-recibido" type="number" inputMode="decimal" placeholder="Otra cantidad"
                onChange={e => calcCambio(e.target.value)}
                className="w-full p-3 border border-ink-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
              {recibido && (
                <div className={`p-3 rounded-xl text-center font-display text-lg font-bold ${cambio !== null ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {cambio !== null ? `Cambio: ${formatPrice(cambio)}` : `Faltan: ${formatPrice(total - parseFloat(recibido))}`}
                </div>
              )}
            </div>
          )}

          {/* Tarjeta panel */}
          {metodo === 'tarjeta' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              💳 Cobra <strong>{formatPrice(total)}</strong> en la terminal y confirma aquí.
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

          <button onClick={handlePago} disabled={!puedePagar || loading}
            className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition disabled:opacity-40">
            {loading ? 'Procesando…' : `Cobrar ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
