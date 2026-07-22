import { useState, useEffect } from 'react';
import { orders as ordersApi } from '../api';
import { useSocket } from '../context/SocketContext';

export default function TVDisplay() {
  const [orders, setOrders] = useState([]);
  const [time, setTime] = useState(new Date());
  const [screen, setScreen] = useState(0);
  const socket = useSocket();

  useEffect(() => {
    ordersApi.getAll().then(all => setOrders(all.filter(o => o.status !== 'cancelado'))).catch(console.error);
    if (!socket) return;
    socket.on('order:update', () => {
      ordersApi.getAll().then(all => setOrders(all.filter(o => o.status !== 'cancelado'))).catch(console.error);
    });
    return () => socket.off('order:update');
  }, [socket]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const s = setInterval(() => setScreen(p => (p + 1) % 3), 12000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  const activeOrders = orders.filter(o => o.status !== 'completado').sort((a, b) => new Date(b.created_at + 'Z') - new Date(a.created_at + 'Z'));
  const readyOrders = orders.filter(o => o.status === 'listo');

  if (screen === 0) {
    return (
      <div className="min-h-screen bg-ink-900 text-cream-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="text-center relative z-10">
          <div className="text-6xl mb-6">🌮</div>
          <h1 className="text-7xl font-black font-display tracking-tight mb-4">La Gaonerita</h1>
          <div className="w-24 h-1 bg-brand-500 mx-auto mb-6" />
          <p className="text-3xl text-cream-100/80 font-light">Tacos artesanales desde el corazón del barrio</p>
          <div className="mt-16 grid grid-cols-2 gap-8 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-5xl font-black text-brand-500">25</div>
              <div className="text-sm uppercase tracking-widest text-cream-100/50 mt-2">Tacos diferentes</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-brand-500">12</div>
              <div className="text-sm uppercase tracking-widest text-cream-100/50 mt-2">PM – 11 PM</div>
            </div>
          </div>
          <div className="mt-12 text-6xl font-mono text-cream-100/30">{time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    );
  }

  if (screen === 1) {
    return (
      <div className="min-h-screen bg-ink-900 text-cream-50 p-12 flex flex-col">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-4xl font-black font-display">🌮 La Gaonerita</h1>
          <div className="text-3xl font-mono text-cream-100/50">{time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <h2 className="text-5xl font-bold text-center mb-12">Órdenes en Preparación</h2>
        <div className="flex-1 grid grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
          {activeOrders.filter(o => o.status === 'preparando').length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="text-8xl mb-6 opacity-50">🍃</div>
              <p className="text-3xl text-cream-100/50">No hay órdenes en preparación</p>
            </div>
          ) : (
            activeOrders.filter(o => o.status === 'preparando').map(order => (
              <div key={order.id} className="bg-blue-500/10 border-2 border-blue-500/30 rounded-3xl p-6 text-center">
                <div className="text-7xl font-black mb-2">#{order.id}</div>
                <div className="text-xl text-blue-300 font-semibold">Preparando</div>
                <div className="text-3xl mt-3 font-semibold">{order.customer_name}</div>
                <div className="text-lg text-cream-100/50 mt-2">{order.order_type === 'domicilio' ? '🛵 Domicilio' : '🏠 Local'}{order.mesa && ` · ${order.mesa}`}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 text-cream-50 p-12 flex flex-col">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-black font-display">🌮 La Gaonerita</h1>
        <div className="text-3xl font-mono text-cream-100/50">{time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <h2 className="text-5xl font-bold text-center mb-12">✅ Órdenes Listas para Recoger</h2>
      {readyOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-8xl mb-6">🕐</div>
            <p className="text-4xl text-cream-100/50">No hay órdenes listas en este momento</p>
            <p className="text-2xl text-cream-100/30 mt-4">Tus tacos están siendo preparados con cariño</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-max">
          {readyOrders.map(order => (
            <div key={order.id} className="bg-green-500/10 border-2 border-green-400 rounded-3xl p-8 text-center animate-pulse flex flex-col items-center justify-center">
              <div className="text-8xl font-black mb-2">#{order.id}</div>
              <div className="text-2xl text-green-300 font-bold uppercase tracking-widest">¡Listo!</div>
              <div className="text-3xl mt-4 font-semibold">{order.customer_name}</div>
              {order.mesa && <div className="text-xl text-green-200/70 mt-2">📍 {order.mesa}</div>}
              {order.order_type === 'domicilio' && <div className="text-xl text-green-200/70 mt-2">🛵 Listo para reparto</div>}
              <div className="mt-4 text-4xl">✅</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
