import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-cream-100">
      <div className="serape-line" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-display text-lg font-extrabold uppercase tracking-wider text-brand-500 mb-3">La Gaonerita</div>
            <p className="text-sm text-ink-300 max-w-xs">Tacos artesanales hechos con ingredientes frescos y recetas de tradición familiar.</p>
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
              <li>Av. Revolución #123, Col. Centro</li>
              <li>Lun – Dom · 12:00 – 23:00</li>
              <li>(55) 1234-5678</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-cream-100/10 mt-10 pt-6 text-xs text-ink-400">
          © {new Date().getFullYear()} La Gaonerita. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
