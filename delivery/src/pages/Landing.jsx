import { useState, useEffect } from 'react';

function FullMenu({ onClose }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl hover:bg-white/30 transition"
        aria-label="Cerrar menú"
      >
        ✕
      </button>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
        </div>
      )}
      <img
        src="/menu.jpg"
        alt="Menú completo La Gaonerita"
        className={`max-w-full max-h-full object-contain p-4 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export default function Landing({ onStartOrder, hasOrder, onTrackOrder }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      {showMenu && <FullMenu onClose={() => setShowMenu(false)} />}
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <img src="/logo.jpeg" alt="La Gaonerita" className="mx-auto mb-6 h-28 lg:h-36 w-auto" />
          <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-4">Hecho al momento</p>
          <div className="flex items-center justify-center gap-3 mt-5" aria-hidden="true">
            <span className="h-px w-16 bg-brand-400" />
            <span className="text-brand-500 text-lg">✦</span>
            <span className="h-px w-16 bg-brand-400" />
          </div>
          <p className="text-ink-400 mt-5 text-lg">Tacos, tortas y más — todo hecho al momento.</p>

          <div className="mt-12 flex flex-col gap-4">
            <button
              onClick={() => setShowMenu(true)}
              className="btn-grow w-full bg-white border-2 border-ink-900/10 text-ink-900 py-5 rounded-2xl font-bold text-lg hover:border-brand-400 hover:shadow-lg transition flex items-center justify-center gap-3"
            >
              <span className="text-2xl">📋</span>
              Ver Menú Completo
            </button>
            <button
              onClick={onStartOrder}
              className="btn-grow w-full bg-brand-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-brand-600 hover:shadow-xl transition flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🛵</span>
              Pedir a Domicilio
            </button>
            {hasOrder && (
              <button
                onClick={onTrackOrder}
                className="btn-grow w-full bg-ink-900 text-cream-50 py-4 rounded-2xl font-bold text-base hover:bg-ink-800 transition flex items-center justify-center gap-3"
              >
                <span className="text-xl">📍</span>
                Seguir Pedido
              </button>
            )}
          </div>

          <p className="text-ink-300 text-xs mt-12">(55) 1234-5678 · Lun – Dom · 12:00 – 23:00</p>
        </div>
      </div>
    </>
  );
}
