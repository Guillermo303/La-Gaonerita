import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { orders as ordersApi } from '../api';

const STATUSES = [
  { key: 'pendiente', label: 'Nuevo', icon: '📝' },
  { key: 'preparando', label: 'En preparación', icon: '👨‍🍳' },
  { key: 'listo', label: 'Pedido terminado', icon: '✅' },
  { key: 'completado', label: 'Enviado / Entregado', icon: '🛵' },
];

const CURRENT_STEP = { pendiente: 0, preparando: 1, listo: 2, completado: 3 };

async function fetchStatus(orderId, setStatus, setOrdersAhead) {
  try {
    const updated = await ordersApi.getStatus(orderId);
    if (updated?.status) setStatus(updated.status);
    if (typeof updated?.orders_ahead === 'number') setOrdersAhead(updated.orders_ahead);
  } catch {}
}

export default function TrackOrder({ order, onBack }) {
  const [status, setStatus] = useState(order?.status || 'pendiente');
  const [ordersAhead, setOrdersAhead] = useState(order?.orders_ahead ?? null);
  const currentStep = CURRENT_STEP[status] ?? 0;

  useEffect(() => {
    if (!order?.id) return;
    const socket = io(import.meta.env.VITE_API_URL || '/', { transports: ['websocket', 'polling'] });
    socket.on('order:update', (updated) => {
      if (updated?.id !== order.id) return;
      if (updated.status) setStatus(updated.status);
      fetchStatus(order.id, setStatus, setOrdersAhead);
    });
    const interval = setInterval(() => fetchStatus(order.id, setStatus, setOrdersAhead), 15000);
    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, [order?.id]);

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-14 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 mb-3">No hay pedido activo</h1>
        <button onClick={onBack} className="block w-full bg-brand-500 text-white py-3 rounded-lg font-bold text-sm hover:bg-brand-600 transition">
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">SEGUIMIENTO</p>
        <h1 className="font-display text-3xl font-extrabold text-ink-900">Orden #{order.id}</h1>
      </div>

      <div className="relative">
        {STATUSES.map((s, i) => {
          const isCurrent = i === currentStep;
          const isReached = i <= currentStep;
          return (
            <div key={s.key} className="flex items-start gap-4 pb-8 relative">
              {i < STATUSES.length - 1 && (
                <div className={`absolute left-3.5 top-8 w-0.5 h-10 ${isReached ? 'bg-brand-500' : 'bg-cream-200'}`} />
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                isReached ? 'bg-brand-500 text-white' : 'bg-cream-100 text-ink-400'
              } ${isCurrent ? 'ring-4 ring-brand-100 scale-110' : ''}`}>
                {isReached && !isCurrent ? '✓' : i + 1}
              </div>
              <div className="pt-0.5">
                <p className={`font-bold ${isReached ? 'text-ink-900' : 'text-ink-300'}`}>{s.icon} {s.label}</p>
                {isCurrent && (
                  <p className="text-sm text-ink-400 mt-1">
                    {status === 'pendiente' && 'Tu pedido fue recibido, ya se está revisando'}
                    {status === 'preparando' && 'Estamos preparando tu orden'}
                    {status === 'listo' && '¡Tu pedido está terminado!'}
                    {status === 'completado' && '¡Gracias, disfruta tu pedido!'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {status !== 'completado' && status !== 'cancelado' && (
        <div className="mt-2 bg-cream-50 border-2 border-ink-900 drop-sm p-5 flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black font-display shrink-0 shadow-lg ring-4 ${ordersAhead !== null && ordersAhead === 0 ? 'bg-green-500 text-white ring-green-100' : 'bg-brand-500 text-white ring-brand-100'}`}>
            {ordersAhead !== null ? ordersAhead : '…'}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Pedidos delante de ti</p>
            <p className="text-sm text-ink-700 font-semibold mt-0.5">
              {ordersAhead !== null
                ? ordersAhead === 0
                  ? '¡Eres el siguiente!'
                  : `${ordersAhead} ${ordersAhead === 1 ? 'pedido por delante' : 'pedidos por delante'}`
                : 'Calculando fila…'}
            </p>
          </div>
        </div>
      )}

      <button onClick={onBack} className="block w-full bg-ink-900 text-cream-50 py-3 rounded-lg font-bold text-sm hover:bg-ink-800 transition mt-4">
        ← Volver
      </button>
    </div>
  );
}
