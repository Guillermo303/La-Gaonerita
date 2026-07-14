import { useState, useEffect } from 'react';
import { promotions as promoApi } from '../api';
import { formatPrice } from '../lib/utils';

export default function PromoBanner() {
  const [promos, setPromos] = useState([]);

  useEffect(() => { promoApi.getActive().then(setPromos).catch(() => {}); }, []);

  if (!promos.length) return null;

  return (
    <div className="space-y-2 px-4 max-w-6xl mx-auto">
      {promos.map(p => (
        <div key={p.id} className="bg-gradient-to-r from-brand-500 to-orange-500 text-white rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <div className="font-black font-display text-lg">{p.name}</div>
            {p.description && <div className="text-sm text-white/80">{p.description}</div>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">{p.discount_type === 'percentage' ? `${p.discount_value}%` : formatPrice(p.discount_value)}</div>
            {p.min_purchase > 0 && <div className="text-xs text-white/70">Mín {formatPrice(p.min_purchase)}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
