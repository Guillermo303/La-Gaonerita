import { useCart } from '../context/CartContext';

const SLOTS = [
  '8:00 – 8:30 pm',
  '8:30 – 9:00 pm',
  '9:00 – 9:30 pm',
  '9:30 – 10:00 pm',
  '10:00 – 10:30 pm',
  '10:30 – 11:00 pm',
];

export default function Horario({ onPrev, onNext }) {
  const { orderType, orderTime, setOrderTime } = useCart();
  const esLocal = orderType === 'local';

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
          <div className="flex flex-col gap-2">
            {SLOTS.map(slot => (
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
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={onPrev} className="px-6 py-3 rounded-lg font-bold text-ink-600 border border-ink-200 hover:bg-cream-100 transition">
            ← Atrás
          </button>
        </div>
      </div>
    </div>
  );
}
