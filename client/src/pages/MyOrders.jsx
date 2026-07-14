import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orders as ordersApi } from '../api';
import { formatPrice, statusColors, statusLabels, typeLabels } from '../lib/utils';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.getAll().then(setOrders).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-8">Mis Pedidos</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-ink-500 mb-6">Aún no has hecho ningún pedido.</p>
          <Link to="/menu" className="inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Ver Menú</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">Pedido #{order.id}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                    <span className="text-xs bg-ink-100 text-ink-600 px-2.5 py-0.5 rounded-full font-semibold">{typeLabels[order.order_type]}</span>
                  </div>
                  <span className="text-sm text-ink-400">{new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className="font-extrabold text-brand-600 text-lg">{formatPrice(order.total)}</span>
              </div>
              <div className="border-t border-cream-200 pt-3 space-y-1">
                {order.items?.map(item => (
                  <div key={item.id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-700">{item.quantity}x {item.name}</span>
                      <span className="text-ink-500">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {item.notes && <div className="text-xs text-yellow-600 ml-2">📝 {item.notes}</div>}
                  </div>
                ))}
              </div>
              {order.order_type === 'domicilio' && order.customer_address && (
                <div className="mt-3 text-sm text-ink-400 bg-cream-100 p-2 rounded-lg">
                  📍 {order.customer_address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
