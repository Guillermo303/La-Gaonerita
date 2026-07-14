import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { settings as settingsApi } from '../api';

export default function Footer() {
  const [s, setS] = useState({});

  useEffect(() => { settingsApi.get().then(setS).catch(() => {}); }, []);

  return (
    <footer className="bg-ink-900 text-cream-100">
      <div className="serape-line" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-display text-lg font-extrabold uppercase tracking-wider text-brand-500 mb-3">La Gaonerita</div>
            <p className="text-sm text-ink-300 max-w-xs">Tacos artesanales hechos con ingredientes frescos y recetas de tradición familiar.</p>
            <div className="flex gap-3 mt-4">
              {s.facebook && <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-brand-400 transition text-lg">f</a>}
              {s.instagram && <a href={s.instagram} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-brand-400 transition text-lg">📷</a>}
              {s.tiktok && <a href={s.tiktok} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-brand-400 transition text-lg">🎵</a>}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-300 mb-3">Explorar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/menu" className="hover:text-brand-400 transition">Menú</Link></li>
              <li><Link to="/jobs" className="hover:text-brand-400 transition">Trabajo</Link></li>
              <li><Link to="/join" className="hover:text-brand-400 transition">Crear Cuenta</Link></li>
              <li><Link to="/login" className="hover:text-brand-400 transition">Iniciar Sesión</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-300 mb-3">Contacto</h4>
            <ul className="space-y-2 text-sm text-ink-200">
              {s.address && <li>📍 {s.address}</li>}
              {s.business_hours && <li>🕐 {s.business_hours}</li>}
              {s.phone && <li>📞 {s.phone}</li>}
              {s.email && <li>✉️ {s.email}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-cream-100/10 mt-10 pt-6 text-xs text-ink-400 text-center">
          © {new Date().getFullYear()} La Gaonerita. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
