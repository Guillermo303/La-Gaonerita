import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';

const OPEN_HOUR = 20; // 8:00 pm
const CLOSE_HOUR = 23; // 11:00 pm
const SLOT_MINUTES = 30;
// La cocina necesita ~1.5h para preparar y despachar; los slots dentro de esa ventana se ocultan.
// Ej.: si son las 8:00pm, la primera franja disponible es 9:30 - 10:00pm.
const MIN_LEAD_MINUTES = 90;
// La taqueria solo abre viernes(5), sabado(6) y domingo(0).
const OPEN_WEEKDAYS = [5, 6, 0];

const formatHour = (date) => {
  const h = date.getHours() % 12 || 12;
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const buildSlots = (now) => {
  const base = new Date(now);
  base.setHours(OPEN_HOUR, 0, 0, 0);
  const totalSlots = ((CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES;
  const threshold = now.getTime() + MIN_LEAD_MINUTES * 60000;

  const slots = [];
  for (let i = 0; i < totalSlots; i++) {
    const start = new Date(base.getTime() + i * SLOT_MINUTES * 60000);
    const end = new Date(start.getTime() + SLOT_MINUTES * 60000);
    if (start.getTime() < threshold) continue;
    const ampm = end.getHours() >= 12 ? 'pm' : 'am';
    slots.push(`${formatHour(start)} – ${formatHour(end)} ${ampm}`);
  }
  return slots;
};

export default function Horario({ onPrev, onNext }) {
  const { orderType, orderTime, setOrderTime } = useCart();
  const esLocal = orderType === 'local';

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const slots = useMemo(() => buildSlots(now), [now]);
  const isOpenToday = OPEN_WEEKDAYS.includes(now.getDay());

  const handleSelect = (time) => {
    setOrderTime(time);
    onNext();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-lg w-full">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">PASO 3 DE 6</p>
        <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900 mb-3">
          Horario de {esLocal ? 'recogida' : 'entrega'}
        </h1>
        <p className="text-ink-400 mb-8">
          {esLocal ? '¿A qué hora pasas por tu pedido?' : '¿A qué hora quieres que llegue?'}
        </p>

        {!isOpenToday ? (
          <div className="bg-white rounded-2xl shadow-sm border border-ink-900/5 p-8">
            <div className="text-5xl mb-4">🌮😴</div>
            <p className="text-ink-900 font-bold text-lg mb-2">Hoy no abrimos</p>
            <p className="text-ink-400 text-sm">Abrimos viernes, sábado y domingo de 20:00 a 23:00 hrs. ¡Te esperamos pronto!</p>
          </div>
        ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-ink-900/5 p-4">
          <button
            onClick={() => handleSelect('lo antes posible')}
            className={`w-full py-3 rounded-xl font-bold text-sm border transition mb-3 ${
              orderTime === 'lo antes posible'
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-cream-50 text-ink-600 border-ink-200 hover:border-brand-300'
            }`}
          >
            ⚡ Lo antes posible
          </button>
          {slots.length > 0 ? (
            <div className="flex flex-col gap-2">
              {slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => handleSelect(slot)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm border transition ${
                    orderTime === slot
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-cream-50 text-ink-600 border-ink-200 hover:border-brand-300'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 text-sm py-2">
              Ya no hay horarios programados disponibles por hoy. Elige "Lo antes posible".
            </p>
          )}
        </div>
        )}

        <div className="flex justify-between mt-8">
          <button onClick={onPrev} className="px-6 py-3 rounded-lg font-bold text-ink-600 border border-ink-200 hover:bg-cream-100 transition">
            ← Atrás
          </button>
        </div>
      </div>
    </div>
  );
}
