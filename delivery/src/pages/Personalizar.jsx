import { useState, useEffect } from 'react';
import { customizations as customizationsApi } from '../api';
import { useCart } from '../context/CartContext';
import Reveal from '../components/Reveal';
import StyledImage from '../components/StyledImage';

function PersonalizaTuPedido({ groups, customizations, setCustomizations }) {
  if (!groups.length) return null;

  const selectSingle = (groupName, optionName) => {
    setCustomizations(prev => ({ ...prev, [groupName]: optionName }));
  };

  const toggleMultiple = (groupName, optionName) => {
    setCustomizations(prev => {
      const current = prev[groupName] || [];
      const next = current.includes(optionName) ? current.filter(o => o !== optionName) : [...current, optionName];
      return { ...prev, [groupName]: next };
    });
  };

  return (
    <Reveal className="mb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-ink-900/5 p-6">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Personaliza tu pedido</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {groups.map(group => (
            <div key={group.id}>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">{group.name}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map(option => {
                  const isMultiple = group.selection_type === 'multiple';
                  const selected = isMultiple
                    ? (customizations[group.name] || []).includes(option.name)
                    : customizations[group.name] === option.name;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => isMultiple ? toggleMultiple(group.name, option.name) : selectSingle(group.name, option.name)}
                      className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full text-sm font-semibold border transition ${selected ? 'bg-brand-500 text-white border-brand-500' : 'bg-cream-50 text-ink-600 border-ink-200 hover:border-brand-300'}`}
                    >
                      {option.image && <StyledImage src={option.image} alt={option.name} shape={option.image_shape || 'circle'} zoom={option.image_zoom} posX={option.image_pos_x} posY={option.image_pos_y} className="w-6 h-6 bg-white/50" />}
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export default function Personalizar({ onPrev, onNext }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { count, customizations, setCustomizations } = useCart();

  useEffect(() => {
    customizationsApi.getAll().then(setGroups).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">No hay productos en tu carrito</h1>
        <p className="text-ink-500 mb-8">Agrega productos desde el menú primero.</p>
        <button onClick={onPrev} className="btn-grow inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600">
          ← Volver al Menú
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="text-center mb-10">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">PASO 5 DE 7</p>
        <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900">Personaliza tu pedido</h1>
        <p className="text-ink-400 mt-3">Elige tus salsas, tortillas y preferencias.</p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center text-ink-400 py-10 bg-white rounded-2xl border border-ink-900/5">
          <p>No hay opciones de personalización disponibles.</p>
        </div>
      ) : (
        <PersonalizaTuPedido groups={groups} customizations={customizations} setCustomizations={setCustomizations} />
      )}

      <div className="flex justify-between items-center mt-10">
        <button onClick={onPrev} className="px-6 py-3 rounded-lg font-bold text-ink-600 border border-ink-200 hover:bg-cream-100 transition">
          ← Atrás
        </button>
        <button onClick={onNext} className="btn-grow px-8 py-3 rounded-lg font-bold text-white bg-brand-500 hover:bg-brand-600 transition">
          Continuar →
        </button>
      </div>
    </div>
  );
}
