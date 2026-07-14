import { useState } from 'react';
import { formatPrice } from '../lib/utils';

export default function SplitBill({ items, total, onSplit, onCancel }) {
  const [mode, setMode] = useState(null);
  const [people, setPeople] = useState([{ items: [], name: 'Persona 1' }]);
  const [equalCount, setEqualCount] = useState(2);

  const allAssigned = items.every(item => people.some(p => p.items.includes(item.id)));

  const resetByItems = () => {
    setPeople([{ items: [], name: 'Persona 1' }]);
    setMode('items');
  };

  const toggleItem = (personIdx, itemId) => {
    setPeople(prev => {
      const p = prev.map(person => ({ ...person, items: person.items.filter(id => id !== itemId) }));
      p[personIdx] = { ...p[personIdx], items: [...p[personIdx].items, itemId] };
      return p;
    });
  };

  const addPerson = () => setPeople(prev => [...prev, { items: [], name: `Persona ${prev.length + 1}` }]);
  const removePerson = (idx) => setPeople(prev => prev.filter((_, i) => i !== idx));

  const personTotal = (p) => items.filter(i => p.items.includes(i.id)).reduce((s, i) => s + i.price * i.quantity, 0);

  if (!mode) return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-widest text-ink-500">Dividir cuenta</div>
      <button onClick={() => setMode('equal')} className="w-full p-3 rounded-xl border-2 border-ink-200 bg-white text-sm font-bold hover:border-brand-400 transition text-left">
        <span className="text-lg mr-2">👥</span> Partes iguales
        <span className="text-ink-400 font-normal block text-xs ml-8">Divide el total entre todas las personas</span>
      </button>
      <button onClick={resetByItems} className="w-full p-3 rounded-xl border-2 border-ink-200 bg-white text-sm font-bold hover:border-brand-400 transition text-left">
        <span className="text-lg mr-2">📋</span> Por producto
        <span className="text-ink-400 font-normal block text-xs ml-8">Cada persona paga sus productos</span>
      </button>
    </div>
  );

  if (mode === 'equal') {
    const each = total / equalCount;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-500">Partes iguales</div>
          <button onClick={() => setMode(null)} className="text-xs text-ink-400 hover:text-ink-600">← Cambiar</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-600">Personas:</span>
          <button onClick={() => setEqualCount(Math.max(2, equalCount - 1))} className="w-8 h-8 rounded-full bg-ink-100 text-sm font-bold">−</button>
          <span className="text-xl font-bold w-8 text-center">{equalCount}</span>
          <button onClick={() => setEqualCount(equalCount + 1)} className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold">+</button>
        </div>
        <div className="bg-ink-50 rounded-xl p-3 text-center">
          <span className="text-ink-400 text-sm">Cada uno paga </span>
          <span className="text-xl font-bold text-brand-600">{formatPrice(each)}</span>
        </div>
        <button onClick={() => onSplit({ mode: 'equal', count: equalCount, each, total })}
          className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-bold text-sm uppercase hover:bg-brand-700 transition">
          Aplicar división
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-500">Por producto</div>
        <button onClick={() => setMode(null)} className="text-xs text-ink-400 hover:text-ink-600">← Cambiar</button>
      </div>
      {people.map((person, pi) => (
        <div key={pi} className="bg-white border border-ink-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <input value={person.name} onChange={e => setPeople(prev => { const p = [...prev]; p[pi] = { ...p[pi], name: e.target.value }; return p; })}
              className="text-sm font-bold bg-transparent border-b border-ink-200 focus:outline-none focus:border-brand-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-brand-600">{formatPrice(personTotal(person))}</span>
              {people.length > 1 && <button onClick={() => removePerson(pi)} className="text-xs text-red-500 hover:text-red-700">✕</button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {items.filter(i => !people.some((p, pj) => pj !== pi && p.items.includes(i.id)) || person.items.includes(i.id)).map(item => {
              const selected = person.items.includes(item.id);
              return (
                <button key={item.id} onClick={() => toggleItem(pi, item.id)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition ${selected ? 'bg-brand-500 text-white border-brand-500' : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-ink-400'}`}>
                  {item.quantity}x {item.name} · {formatPrice(item.price * item.quantity)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button onClick={addPerson} className="w-full py-2 rounded-xl border-2 border-dashed border-ink-300 text-sm text-ink-500 hover:border-brand-400 hover:text-brand-600 transition font-medium">
        + Agregar persona
      </button>
      <button onClick={() => onSplit({ mode: 'items', people: people.map(p => ({ name: p.name, items: p.items, subtotal: personTotal(p) })), total })}
        disabled={!allAssigned}
        className="w-full bg-brand-600 text-white py-2.5 rounded-xl font-bold text-sm uppercase hover:bg-brand-700 transition disabled:opacity-40">
        {allAssigned ? 'Aplicar división' : 'Asigna todos los productos'}
      </button>
    </div>
  );
}
