import { useCart } from '../context/CartContext';

export default function TipoServicio({ onPrev, onNext }) {
  const { setOrderType } = useCart();

  const handleSelect = (type) => {
    setOrderType(type);
    onNext();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">PASO 2 DE 6</p>
        <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900 mb-3">¿Cómo quieres tu orden?</h1>
        <p className="text-ink-400 mb-10">Elige cómo recibir tus tacos.</p>
        <div className="flex flex-col gap-4">
          <button onClick={() => handleSelect('local')}
            className="btn-grow w-full bg-white border-2 border-ink-900/10 text-ink-900 py-6 rounded-2xl font-bold text-lg hover:border-brand-400 hover:shadow-lg transition flex items-center justify-center gap-3">
            <span className="text-3xl">🏪</span>
            Recoger en el local
          </button>
          <button onClick={() => handleSelect('domicilio')}
            className="btn-grow w-full bg-brand-500 text-white py-6 rounded-2xl font-bold text-lg hover:bg-brand-600 hover:shadow-xl transition flex items-center justify-center gap-3">
            <span className="text-3xl">🛵</span>
            Entregar a domicilio
          </button>
        </div>
        <button onClick={onPrev} className="mt-8 px-6 py-3 rounded-lg font-bold text-ink-600 border border-ink-200 hover:bg-cream-100 transition">
          ← Atrás
        </button>
      </div>
    </div>
  );
}
