import { useState, useEffect } from 'react';
import { menu as menuApi } from '../api';
import { formatPrice } from '../lib/utils';

function ItemRow({ item, onToggle }) {
  const [loading, setLoading] = useState(false);
  const agotado = item.stock <= 0;

  const handleToggle = async () => {
    setLoading(true);
    try { await onToggle(item, agotado ? item.max_stock : 0); }
    finally { setLoading(false); }
  };

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg gap-3 ${agotado ? 'bg-red-50' : ''}`}>
      <div className="min-w-0">
        <div className="font-medium text-ink-900 truncate">{item.name}</div>
        <div className="text-sm text-ink-400">{formatPrice(item.price)}</div>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 ${agotado ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
      >
        {agotado ? '✅ Disponible de nuevo' : '🚫 Marcar agotado hoy'}
      </button>
    </div>
  );
}

export default function Disponibilidad() {
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = () => menuApi.getAllAdmin().then(setMenuData).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);

  const handleToggle = async (item, newStock) => {
    setError('');
    try { await menuApi.updateStock(item.id, newStock); reload(); } catch (e) { setError(e.message); }
  };

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 mb-1">Disponibilidad del Menú</h1>
      <p className="text-ink-400 text-sm mb-6">Marca un platillo como agotado si ya no hay existencias — desaparece del menú de clientes por el resto del día y vuelve a aparecer automáticamente mañana.</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="space-y-6">
        {menuData.filter(cat => cat.items.some(i => i.available)).map(cat => (
          <div key={cat.id} className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
            <div className="bg-cream-50 px-4 py-3 border-b border-ink-100 font-bold text-ink-900">{cat.name}</div>
            <div className="divide-y divide-ink-100">
              {cat.items.filter(i => i.available).map(item => (
                <ItemRow key={item.id} item={item} onToggle={handleToggle} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
