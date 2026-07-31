import { useEffect, useState } from 'react';
import { orders as ordersApi } from '../api';

const STATUSES = [
  { key: 'pendiente', label: 'Pedido recibido', icon: '📝' },
  { key: 'preparando', label: 'Preparando', icon: '👨‍🍳' },
  { key: 'ahead', label: 'Pedidos delante', icon: '🕐' },
  { key: 'listo', label: 'Pedido listo', icon: '✅' },
  { key: 'completado', label: 'Entregando', icon: '🛵' },
];

const CURRENT_STEP = { pendiente: 0, preparando: 1, listo: 3, completado: 4 };

export default function TrackOrder({ order, onBack }) {
  const [status, setStatus] = useState(order?.status || 'pendiente');
  const [ordersAhead, setOrdersAhead] = useState(order?.orders_ahead ?? null);
  const currentStep = CURRENT_STEP[status] ?? 0;

  useEffect(() => {
    if (!order?.id) return;
    const interval = setInterval(async () => {
      try {
        const updated = await ordersApi.getStatus(order.id);
        if (updated?.status) setStatus(updated.status);
        if (typeof updated?.orders_ahead === 'number') setOrdersAhead(updated.orders_ahead);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
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
                {s.key === 'ahead' && (
                  <p className="text-sm text-ink-400 mt-1">
                    {ordersAhead !== null
                      ? ordersAhead === 0
                        ? '¡Eres el siguiente!'
                        : `${ordersAhead} ${ordersAhead === 1 ? 'pedido por delante' : 'pedidos por delante'}`
                      : 'Calculando fila…'}
                  </p>
                )}
                {s.key !== 'ahead' && isCurrent && (
                  <p className="text-sm text-ink-400 mt-1">
                    {status === 'pendiente' && 'Tu pedido está en espera para prepararse'}
                    {status === 'preparando' && 'Estamos preparando tu orden'}
                    {status === 'listo' && '¡Tu pedido está listo!'}
                    {status === 'completado' && '¡Gracias, disfruta tu pedido!'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onBack} className="block w-full bg-ink-900 text-cream-50 py-3 rounded-lg font-bold text-sm hover:bg-ink-800 transition mt-4">
        ← Volver
      </button>
    </div>
  );
}
