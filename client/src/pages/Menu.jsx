import { useState, useEffect } from 'react';
import { menu as menuApi } from '../api';
import { formatPrice } from '../lib/utils';
import Reveal from '../components/Reveal';
import StyledImage from '../components/StyledImage';

const DELIVERY_URL = import.meta.env.VITE_DELIVERY_URL || 'http://localhost:5176';

export default function Menu() {
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    menuApi.getAll().then(setMenuData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-14 pb-32">
      <div className="text-center mb-14">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-3">Hecho al momento</p>
        <h1 className="heading-editorial text-4xl lg:text-5xl text-ink-900">Nuestro Menú</h1>
        <div className="flex items-center justify-center gap-3 mt-4" aria-hidden="true">
          <span className="h-px w-12 bg-brand-400" />
          <span className="text-brand-500">✦</span>
          <span className="h-px w-12 bg-brand-400" />
        </div>
        <p className="text-ink-400 mt-4">Para ordenar a domicilio, visita nuestra app de pedidos.</p>
        <a href={DELIVERY_URL} target="_blank" rel="noopener noreferrer" className="drop inline-block mt-5 bg-brand-500 text-white px-8 py-3 border-2 border-black font-bold uppercase tracking-widest text-sm hover:bg-brand-600">Ordenar a Domicilio 🛵</a>
      </div>
      {menuData.filter(cat => cat.items.length > 0).map(cat => (
        <Reveal key={cat.id} className="mb-14">
          <div className="flex items-baseline gap-4 mb-6">
            <h2 className="heading-editorial text-2xl lg:text-3xl text-brand-600">{cat.name}</h2>
            <div className="flex-1 border-b-2 border-dotted border-ink-200" />
          </div>
          {cat.description && <p className="text-ink-400 -mt-3 mb-6">{cat.description}</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.items.map(item => (
              <div key={item.id} className="card-glow group drop bg-white border-2 border-ink-900 p-5">
                {item.image && (
                  <StyledImage src={item.image} alt={item.name} shape={item.image_shape} zoom={item.image_zoom} posX={item.image_pos_x} posY={item.image_pos_y} className="aspect-[4/3] mb-3 bg-cream-100" />
                )}
                <div className="flex items-baseline justify-between gap-0">
                  <h3 className="heading-editorial text-lg text-ink-900">{item.name}</h3>
                  <span className="dot-lead" aria-hidden="true"></span>
                  <span className="text-brand-600 font-extrabold whitespace-nowrap">{formatPrice(item.price)}</span>
                </div>
                {item.ready_to_serve ? <p className="text-brand-500 text-xs font-bold uppercase tracking-wider mt-1"><span className="icon-float inline-block">⚡</span> Listo al instante</p> : null}
                {item.description && <p className="text-ink-400 text-sm mt-2 leading-relaxed">{item.description}</p>}
              </div>
            ))}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
