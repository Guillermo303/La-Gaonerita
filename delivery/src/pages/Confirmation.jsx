import { useEffect, useState } from 'react';
import { orders as ordersApi } from '../api';

export default function Confirmation({ order, tortilla, onReset, onTrack }) {
  const [mpLink, setMpLink] = useState(null);

  useEffect(() => {
    if (order?.payment_method === 'transferencia') {
      ordersApi.getMercadoPagoLink(order.id).then(setMpLink).catch(() => {});
    }
  }, [order]);

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
      {tortilla && (
        <div className="bg-white border border-ink-900/10 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">Tu pedido</p>
          <p className="text-sm text-ink-700">🌽 Tipo de tortilla: <span className="font-semibold text-ink-900">{tortilla}</span></p>
        </div>
      )}
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
      <button onClick={onTrack} className="block w-full bg-ink-900 text-cream-50 py-3 rounded-lg font-bold text-sm hover:bg-ink-800 transition mb-3">
        📍 Seguir Pedido
      </button>
      <button onClick={onReset} className="block w-full bg-brand-500 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">
        Volver al Menú
      </button>
    </div>
  );
}
