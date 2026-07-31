import { useState, useEffect, useMemo } from 'react';
import { menu as menuApi, promotions as promotionsApi, orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';
import StyledImage from '../components/StyledImage';
import { useSocket } from '../context/SocketContext';

const SLIDE_MS = 9000;
const REFRESH_MS = 60000;
const ITEMS_PER_SLIDE = 6;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function QueueBanner() {
  const [queue, setQueue] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    const load = () => ordersApi.getQueueCurrent().then(setQueue).catch(console.error);
    load();
    if (socket) socket.on('order:update', load);
    return () => { if (socket) socket.off('order:update', load); };
  }, [socket]);

  if (!queue) return null;

  return (
    <div className="shrink-0 bg-brand-500 px-10 py-4 flex items-center justify-center gap-4">
      {queue.number ? (
        <>
          <span className="text-2xl">{queue.status === 'preparando' ? '👨‍🍳' : '⏭️'}</span>
          <span className="text-2xl font-bold uppercase tracking-widest">
            {queue.status === 'preparando' ? 'Preparando ahora' : 'Siguiente turno'}
          </span>
          <span className="text-4xl font-black font-display">#{queue.number}</span>
        </>
      ) : (
        <span className="text-xl font-bold uppercase tracking-widest">🍃 Sin pedidos en fila</span>
      )}
    </div>
  );
}

export default function MenuBoard() {
  const [menuData, setMenuData] = useState([]);
  const [promos, setPromos] = useState([]);
  const [time, setTime] = useState(new Date());
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const load = () => {
      menuApi.getAll().then(setMenuData).catch(console.error);
      promotionsApi.getAll().then(setPromos).catch(console.error);
    };
    load();
    const r = setInterval(load, REFRESH_MS);
    return () => clearInterval(r);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const slides = useMemo(() => {
    const promoSlides = promos.map(promo => ({ promo }));
    const catSlides = menuData
      .filter(cat => cat.items.length > 0)
      .flatMap(cat => chunk(cat.items, ITEMS_PER_SLIDE).map((items, i) => ({
        name: cat.items.length > ITEMS_PER_SLIDE ? `${cat.name} (${i + 1})` : cat.name,
        items
      })));
    return [{ intro: true }, ...promoSlides, ...catSlides];
  }, [menuData, promos]);

  useEffect(() => {
    setSlide(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!menuData.length) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-brand-500" />
      </div>
    );
  }

  const current = slides[slide];

  return (
    <div className="min-h-screen bg-ink-900 text-cream-50 overflow-hidden relative flex flex-col">
      <div className="serape-line" aria-hidden="true" />
      <div className="flex items-center justify-between px-10 py-6 shrink-0">
        <h1 className="text-3xl font-black font-display">🌮 La Gaonerita</h1>
        <div className="text-2xl font-mono text-cream-100/50">{time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <QueueBanner />

      <div key={slide} className="menuboard-slide flex-1 px-14 pb-10 flex flex-col justify-center">
        {current.intro ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-8xl mb-6">🌮</div>
            <h2 className="text-6xl font-black font-display mb-4">Hecho al momento</h2>
            <p className="text-2xl text-cream-100/70">Tacos artesanales desde el corazón del barrio</p>
          </div>
        ) : current.promo ? (
          <div className="flex flex-col items-center justify-center text-center gap-6">
            {current.promo.image ? (
              <StyledImage
                src={current.promo.image} alt={current.promo.name}
                shape={current.promo.image_shape} zoom={current.promo.image_zoom}
                posX={current.promo.image_pos_x} posY={current.promo.image_pos_y}
                className="w-64 h-64 border-4 border-brand-500 shadow-2xl"
              />
            ) : (
              <div className="text-8xl">🎉</div>
            )}
            <div className="bg-brand-500 text-white text-sm font-bold uppercase tracking-widest px-5 py-1.5 rounded-full">Promoción</div>
            <h2 className="text-6xl font-black font-display">{current.promo.name}</h2>
            {current.promo.description && <p className="text-2xl text-cream-100/70 max-w-3xl">{current.promo.description}</p>}
          </div>
        ) : (
          <>
            <h2 className="text-5xl font-black font-display text-brand-500 mb-10 text-center">{current.name}</h2>
            <div className="grid grid-cols-3 gap-8">
              {current.items.map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
                  {item.image ? (
                    <StyledImage src={item.image} alt={item.name} shape={item.image_shape} zoom={item.image_zoom} posX={item.image_pos_x} posY={item.image_pos_y} className="w-full h-52" />
                  ) : (
                    <div className="w-full h-52 bg-white/5 flex items-center justify-center text-6xl">🌮</div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <h3 className="text-2xl font-bold">{item.name}</h3>
                      <span className="text-brand-400 text-2xl font-black whitespace-nowrap">{formatPrice(item.price)}</span>
                    </div>
                    {item.description && <p className="text-cream-100/60 text-lg leading-snug">{item.description}</p>}
                    {item.ready_to_serve ? <p className="text-brand-400 text-sm font-bold uppercase tracking-wider mt-auto pt-3">⚡ Listo al instante</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="pb-8 flex items-center justify-center gap-2 shrink-0">
          {slides.map((_, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full transition ${i === slide ? 'bg-brand-500' : 'bg-white/20'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
