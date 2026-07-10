import { useState, useEffect } from 'react';
import { orders as ordersApi } from '../api';
import { formatPrice, statusColors, statusLabels, typeLabels } from '../lib/utils';

const statusGroups = ['todas', 'completado', 'cancelado'];
const statusGroupLabels = { todas: 'Todas', completado: 'Completadas', cancelado: 'Canceladas' };

export default function History() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    ordersApi.getHistory().then(setOrders).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    if (filter !== 'todas' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.customer_name.toLowerCase().includes(q) || String(o.id).includes(q) || o.customer_phone?.includes(q);
    }
    return true;
  });

  const total = filtered.reduce((s, o) => s + o.total, 0);

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-extrabold text-ink-900 mb-6">Historial de Pedidos</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
          {statusGroups.map(g => (
            <button key={g} onClick={() => setFilter(g)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${filter === g ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>
              {statusGroupLabels[g]}
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, #orden o teléfono…"
          className="flex-1 min-w-[200px] p-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <span className="text-sm text-ink-400 font-medium">{filtered.length} pedidos · {formatPrice(total)}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-semibold">No hay pedidos en este historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-ink-100 p-4 hover:shadow-md transition">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-ink-900">#{order.id}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{typeLabels[order.order_type]}</span>
                  <span className="text-sm font-semibold text-ink-700">{order.customer_name}</span>
                </div>
                <span className="font-extrabold text-brand-600">{formatPrice(order.total)}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-400 mb-2">
                <span>{new Date(order.created_at + 'Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                {order.order_type === 'domicilio' && order.customer_address && <span>📍 {order.customer_address}</span>}
                {order.payment_method && <span>💳 {order.payment_method}{order.payment_status === 'pagado' ? ' (pagado)' : ''}</span>}
              </div>
              <details className="text-sm">
                <summary className="text-brand-600 font-semibold cursor-pointer hover:underline">Ver productos ({order.items?.length || 0})</summary>
                <div className="mt-2 bg-cream-50 rounded-lg p-3 space-y-1">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-ink-700">{item.quantity}x {item.name}</span>
                      <span className="text-ink-500">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {order.notes && <div className="text-yellow-700 pt-1 border-t border-cream-200 mt-1">📝 {order.notes}</div>}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
