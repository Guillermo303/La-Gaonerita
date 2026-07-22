import { useState, useEffect } from 'react';
import { mesas as mesasApi } from '../api';

const stateStyles = {
  libre: { bg: 'bg-white', border: 'border-ink-200', text: 'text-ink-500', label: 'Libre', dot: '○' },
  ocupada: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', label: 'Ocupada', dot: '●' },
  'pendiente-pago': { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', label: 'Por cobrar', dot: '💰' }
};

export default function MesaSelector({ selected, onSelect, showLabel }) {
  const [mesas, setMesas] = useState([]);

  useEffect(() => { mesasApi.getAll().then(setMesas).catch(console.error); }, []);

  return (
    <div>
      {showLabel && <div className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Mesa</div>}
      <div className="flex flex-wrap gap-2">
        {mesas.map(m => {
          const s = stateStyles[m.state] || stateStyles.libre;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.name)}
              className={`px-3 py-2 rounded-lg border-2 text-sm font-bold font-display uppercase tracking-wide transition-all ${s.bg} ${s.border} ${s.text} ${selected === m.name ? 'ring-2 ring-brand-500 scale-105' : 'hover:scale-105'}`}
            >
              <span className="mr-1">{s.dot}</span> {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
