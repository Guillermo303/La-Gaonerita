import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';
import CobroModal from './CobroModal';

const mesaStyles = {
  libre: { bg: 'bg-white', border: 'border-ink-200', text: 'text-ink-400', dot: '○', label: 'Libre' },
  ocupada: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', dot: '🟡', label: 'Ocupada' },
  'pendiente-pago': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', dot: '💰', label: 'Cuenta' }
};

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  completado: 'bg-purple-100 text-purple-800'
};

export default function MesaPanel({ mesa, onClose, onUpdate }) {
  const [orders, setOrders] = useState([]);
  const [cobrando, setCobrando] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const s = mesaStyles[mesa.state] || mesaStyles.libre;

  useEffect(() => {
    ordersApi.getAll().then(all => {
      setOrders(all.filter(o => o.mesa === mesa.name));
      setLoading(false);
    }).catch(console.error);
  }, [mesa.name]);

  const updateStatus = async (id, status) => {
    await ordersApi.updateStatus(id, status).catch(console.error);
    const all = await ordersApi.getAll().catch(() => []);
    setOrders(all.filter(o => o.mesa === mesa.name));
    if (onUpdate) onUpdate();
  };

  const handlePaid = () => {
    if (onUpdate) onUpdate();
    onClose();
  };

  const goToNewOrder = () => {
    navigate(`/waiter/new-order?mesa=${encodeURIComponent(mesa.name)}`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-cream-50 w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-cream-50 z-10 border-b border-ink-200 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-lg font-black font-display uppercase ${s.text}`}>{mesa.name}</div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border}`}>{s.dot} {s.label}</span>
            </div>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl">✕</button>
          </div>

          <div className="p-5 space-y-4">
            {/* Empty / Actions for libre */}
            {mesa.state === 'libre' && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🍽️</div>
                <p className="text-ink-400 mb-4">Mesa libre</p>
                <button onClick={goToNewOrder}
                  className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-600 transition">
                  + Nueva Orden en {mesa.name}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (mesa.state === 'ocupada' || mesa.state === 'pendiente-pago') && (
              <div className="text-center py-10 text-ink-400">Cargando órdenes…</div>
            )}

            {/* Orders list */}
            {!loading && orders.length > 0 && (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className={`bg-white rounded-xl border-2 p-4 shadow-sm ${statusColors[order.status] ? 'border-transparent' : ''}`}
                    style={{ borderLeftColor: order.status === 'completado' ? '#a855f7' : order.status === 'listo' ? '#22c55e' : order.status === 'preparando' ? '#3b82f6' : '#eab308', borderLeftWidth: '4px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-ink-900">#{order.id}</span>
                      <span className="font-bold text-brand-600">{formatPrice(order.total)}</span>
                    </div>
                    <div className="space-y-1 text-sm mb-3">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-ink-700">{item.quantity}x {item.name}</span>
                          <span className="text-ink-400">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-2">📝 {order.notes}</div>}
                    <div className="flex gap-2">
                      {order.status === 'pendiente' && (
                        <button onClick={() => updateStatus(order.id, 'preparando')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-blue-600">En Proceso</button>
                      )}
                      {order.status === 'preparando' && (
                        <button onClick={() => updateStatus(order.id, 'listo')} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-600">Marcar Listo</button>
                      )}
                      {order.status === 'listo' && (
                        <button onClick={() => updateStatus(order.id, 'completado')} className="flex-1 bg-brand-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-brand-600">Entregado</button>
                      )}
                      {order.status === 'completado' && order.payment_status !== 'pagado' && (
                        <button onClick={() => setCobrando(order)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-700">💰 Cobrar {formatPrice(order.total)}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Only pending payment but no orders shown (edge case) */}
            {mesa.state === 'pendiente-pago' && !loading && orders.length === 0 && (
              <div className="text-center py-6 text-ink-400">
                <p>No hay órdenes visibles. Recarga la página.</p>
                <button onClick={onClose} className="mt-3 text-brand-600 font-semibold hover:underline">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {cobrando && (
        <CobroModal order={cobrando} onClose={() => { setCobrando(null); onClose(); }} onPaid={handlePaid} />
      )}
    </>
  );
}
