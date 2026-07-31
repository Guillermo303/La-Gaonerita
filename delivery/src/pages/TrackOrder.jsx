import { useEffect, useState } from 'react';
import { orders as ordersApi } from '../api';

const STATUSES = [
  { key: 'pendiente', label: 'Pedido recibido', icon: '📝' },
  { key: 'preparando', label: 'Preparando', icon: '👨‍🍳' },
  { key: 'listo', label: 'Pedido listo', icon: '✅' },
  { key: 'completado', label: 'Entregado', icon: '🏁' },
];

const STATUS_ORDER = { pendiente: 0, preparando: 1, listo: 2, completado: 3 };

export default function TrackOrder({ order, onBack }) {
  const [status, setStatus] = useState(order?.status || 'pendiente');
  const currentStep = STATUS_ORDER[status] ?? 0;

  useEffect(() => {
    if (!order?.id) return;
    const interval = setInterval(async () => {
      try {
        const updated = await ordersApi.getStatus(order.id);
        if (updated?.status) setStatus(updated.status);
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
          const isDone = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={s.key} className="flex items-start gap-4 pb-8 relative">
              {i < STATUSES.length - 1 && (
                <div className={`absolute left-3.5 top-8 w-0.5 h-10 ${isDone ? 'bg-brand-500' : 'bg-cream-200'}`} />
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                isDone ? 'bg-brand-500 text-white' : 'bg-cream-100 text-ink-400'
              } ${isCurrent ? 'ring-4 ring-brand-100 scale-110' : ''}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className="pt-0.5">
                <p className={`font-bold ${isDone ? 'text-ink-900' : 'text-ink-300'}`}>{s.icon} {s.label}</p>
                {isCurrent && status === 'pendiente' && (
                  <p className="text-sm text-ink-400 mt-1">Tu pedido está en espera para prepararse</p>
                )}
                {isCurrent && status === 'preparando' && (
                  <p className="text-sm text-ink-400 mt-1">Estamos preparando tu orden</p>
                )}
                {isCurrent && status === 'listo' && (
                  <p className="text-sm text-ink-400 mt-1">¡Tu pedido está listo!</p>
                )}
                {isCurrent && status === 'completado' && (
                  <p className="text-sm text-ink-400 mt-1">¡Disfruta tu pedido!</p>
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
