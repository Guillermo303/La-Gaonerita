import { useState, useEffect } from 'react';
import { orders as ordersApi } from '../api';
import { useSocket } from '../context/SocketContext';
import { formatPrice, typeLabels } from '../lib/utils';
import CobroModal from '../components/CobroModal';

export default function PendingBills() {
  const [orders, setOrders] = useState([]);
  const [cobrando, setCobrando] = useState(null);
  const socket = useSocket();

  const load = () => ordersApi.getAll().then(setOrders).catch(console.error);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!socket) return;
    socket.on('order:update', load);
    return () => socket.off('order:update');
  }, [socket]);

  const unpaid = orders.filter(o => o.status === 'completado' && o.payment_status !== 'pagado');
  const totalPendiente = unpaid.reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black font-display text-ink-900">💰 Cuentas Pendientes</h1>
          <p className="text-ink-400 text-sm mt-1">{unpaid.length} orden{(unpaid.length !== 1) ? 'es' : ''} por cobrar</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-400 uppercase tracking-wider font-semibold">Total Pendiente</div>
          <div className="text-2xl font-black text-brand-600">{formatPrice(totalPendiente)}</div>
        </div>
      </div>

      {unpaid.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-xl font-bold text-ink-900 mb-2">No hay cuentas pendientes</p>
          <p className="text-ink-400">Todas las órdenes completadas están pagadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unpaid.map(order => (
            <div key={order.id} className="bg-white rounded-xl border-2 border-ink-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xl text-ink-900">#{order.id}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Entregado</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{typeLabels[order.order_type]}</span>
                    {order.mesa && <span className="text-sm text-ink-400 font-medium">{order.mesa}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-black text-xl text-ink-900">{formatPrice(order.total)}</div>
                      <div className="text-xs text-red-500 font-semibold uppercase tracking-wider">Pendiente</div>
                    </div>
                    <button onClick={() => setCobrando(order)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-sm whitespace-nowrap">
                      💰 Cobrar
                    </button>
                  </div>
                </div>
                <div className="text-sm text-ink-500 space-y-0.5 mb-2">
                  {order.items?.map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                      {item.notes && <div className="text-xs text-yellow-600 ml-2">📝 {item.notes}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-ink-400">
                  <span className="font-semibold text-ink-600">{order.customer_name}</span>
                  {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                  {order.order_type === 'domicilio' && order.customer_address && <span>📍 {order.customer_address}</span>}
                  {order.notes && <span className="text-yellow-600">📝 {order.notes}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cobrando && (
        <CobroModal order={cobrando} onClose={() => setCobrando(null)} onPaid={load} />
      )}
    </div>
  );
}
