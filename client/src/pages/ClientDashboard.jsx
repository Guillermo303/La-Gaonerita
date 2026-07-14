import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orders as ordersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../lib/utils';

const statusColors = {
  pendiente: { bg: 'bg-yellow-50 border-yellow-400', badge: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
  preparando: { bg: 'bg-blue-50 border-blue-400', badge: 'bg-blue-100 text-blue-800', label: 'Preparando' },
  listo: { bg: 'bg-green-50 border-green-400', badge: 'bg-green-100 text-green-800', label: 'Listo' },
  completado: { bg: 'bg-purple-50 border-purple-400', badge: 'bg-purple-100 text-purple-800', label: 'Entregado' },
  cancelado: { bg: 'bg-red-50 border-red-400', badge: 'bg-red-100 text-red-800', label: 'Cancelado' }
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => { ordersApi.getAll().then(setOrders).catch(console.error); }, []);

  const myOrders = user ? orders.filter(o => o.customer_name === user.name || o.user_id === user.id) : [];
  const activeOrders = myOrders.filter(o => o.status !== 'completado' && o.status !== 'cancelado');
  const recentOrders = myOrders.slice(-5).reverse();

  const contarStatus = (s) => myOrders.filter(o => o.status === s).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-black font-display text-ink-900">
          ¡Hola, {user?.name || 'Cliente'}! 👋
        </h1>
        <p className="text-ink-400 text-sm mt-1">Bienvenido a La Gaonerita</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100 text-center">
          <div className="text-2xl font-black text-ink-900">{myOrders.length}</div>
          <div className="text-xs text-ink-400 font-medium uppercase tracking-wider mt-1">Total Órdenes</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200 text-center">
          <div className="text-2xl font-black text-yellow-700">{contarStatus('pendiente')}</div>
          <div className="text-xs text-yellow-600 font-medium uppercase tracking-wider mt-1">Pendientes</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200 text-center">
          <div className="text-2xl font-black text-blue-700">{contarStatus('preparando')}</div>
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wider mt-1">Preparando</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200 text-center">
          <div className="text-2xl font-black text-green-700">{contarStatus('listo')}</div>
          <div className="text-xs text-green-600 font-medium uppercase tracking-wider mt-1">Listos</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link to="/menu" className="flex-1 min-w-[140px] bg-brand-500 text-white px-5 py-3 rounded-xl font-bold text-sm text-center hover:bg-brand-600 transition shadow-sm">
          🍽️ Ordenar
        </Link>
        <Link to="/my-orders" className="flex-1 min-w-[140px] bg-white text-ink-700 px-5 py-3 rounded-xl font-bold text-sm text-center border border-ink-200 hover:bg-ink-50 transition shadow-sm">
          📋 Mis Órdenes
        </Link>
        <Link to="/menu" className="flex-1 min-w-[140px] bg-white text-ink-700 px-5 py-3 rounded-xl font-bold text-sm text-center border border-ink-200 hover:bg-ink-50 transition shadow-sm">
          🌮 Ver Menú
        </Link>
        <Link to="/local-order" className="flex-1 min-w-[140px] bg-white text-ink-700 px-5 py-3 rounded-xl font-bold text-sm text-center border border-ink-200 hover:bg-ink-50 transition shadow-sm">
          🏠 Pedir en Local
        </Link>
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-ink-900 mb-3">Órdenes Activas</h2>
          <div className="space-y-3">
            {activeOrders.map(order => {
              const cfg = statusColors[order.status] || statusColors.pendiente;
              return (
                <div key={order.id} className={`bg-white rounded-xl border-2 shadow-sm ${cfg.bg} p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-ink-900">#{order.id}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.order_type === 'domicilio' ? 'Domicilio' : 'Local'}</span>
                    </div>
                    <span className="font-bold text-brand-600">{formatPrice(order.total)}</span>
                  </div>
                  <div className="text-sm text-ink-500 space-y-0.5">
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
                  {order.notes && <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2">📝 {order.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-ink-900 mb-3">Órdenes Recientes</h2>
          <div className="space-y-2">
            {recentOrders.map(order => {
              const cfg = statusColors[order.status] || statusColors.pendiente;
              const created = new Date(order.created_at + 'Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              return (
                <div key={order.id} className="bg-white rounded-xl border border-ink-100 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-ink-900">#{order.id}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    <span className="text-xs text-ink-400">{created}</span>
                  </div>
                  <span className="font-bold text-ink-700 text-sm">{formatPrice(order.total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myOrders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="text-5xl mb-4">🌮</div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">¡Haz tu primer pedido!</h2>
          <p className="text-ink-400 text-sm mb-6">Explora nuestro menú y elige tus tacos favoritos</p>
          <Link to="/menu" className="bg-brand-500 text-white px-6 py-3 rounded-xl font-bold text-sm inline-block hover:bg-brand-600 transition">
            Ver Menú
          </Link>
        </div>
      )}
    </div>
  );
}
