import { useEffect, useState } from 'react';
import { orders as ordersApi } from '../api';

const STATUSES = [
  { key: 'pendiente', label: 'Pedido recibido', icon: '📝' },
  { key: 'preparando', label: 'Preparando', icon: '👨‍🍳' },
  { key: 'listo', label: 'Pedido listo', icon: '✅' },
  { key: 'completado', label: 'Entregado', icon: '🏁' },
];

const STATUS_ORDER = { pendiente: 0, preparando: 1, listo: 2, completado: 3 };

function TrackingView({ order, onBack }) {
  const [status, setStatus] = useState(order?.status || 'pendiente');
  const currentStep = STATUS_ORDER[status] ?? 0;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await ordersApi.getStatus(order.id);
        if (updated?.status) setStatus(updated.status);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [order.id]);

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

export default function Confirmation({ order, onReset }) {
  const [mpLink, setMpLink] = useState(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (order?.payment_method === 'transferencia') {
      ordersApi.getMercadoPagoLink(order.id).then(setMpLink).catch(() => {});
    }
  }, [order]);

  if (tracking && order) {
    return <TrackingView order={order} onBack={() => setTracking(false)} />;
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="pop-in text-6xl mb-4">✅</div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">¡Pedido recibido!</h1>
        <p className="text-ink-500 mb-6">Tu pedido ya está en la cocina.</p>
        <button onClick={onReset} className="btn-grow inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600">
          Volver al Menú
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="pop-in text-6xl mb-4">✅</div>
      <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">¡Pedido recibido!</h1>
      <p className="text-ink-500 mb-2">Tu orden <span className="font-bold text-brand-600">#{order.id}</span> ya está en la cocina.</p>
      <p className="text-ink-400 text-sm mb-8">Te lo llevamos a tu dirección en cuanto esté listo.</p>
      {order.payment_method === 'transferencia' && (
        <div className="bg-cream-50 border border-brand-200 rounded-xl p-5 mb-6 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Pago por transferencia</p>
          {mpLink ? (
            <>
              {mpLink.demo && (
                <p className="text-xs text-ink-400 mb-2">🚧 Modo demostración — este link es solo para probar cómo se vería, aún no procesa pagos reales.</p>
              )}
              <a href={mpLink.link} target="_blank" rel="noopener noreferrer"
                className="btn-grow block w-full text-center bg-[#009EE3] text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:opacity-90">
                Pagar con Mercado Pago
              </a>
            </>
          ) : (
            <p className="text-sm text-ink-500">Generando tu link de pago…</p>
          )}
        </div>
      )}
      <button onClick={() => setTracking(true)} className="block w-full bg-ink-900 text-cream-50 py-3 rounded-lg font-bold text-sm hover:bg-ink-800 transition mb-3">
        📍 Seguir Pedido
      </button>
      <button onClick={onReset} className="block w-full bg-brand-500 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">
        Volver al Menú
      </button>
    </div>
  );
}
