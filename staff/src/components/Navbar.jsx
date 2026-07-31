import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINK_CLS = "link-underline text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition";
const MOBILE_LINK_CLS = "block py-2.5 text-sm font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // La cuenta admin ahora es la version de cocina/caja del dia a dia: solo
  // ve el tablero de ordenes y la pantalla de cobro, sin el resto del panel
  // de administracion.
  const links = user.role === 'admin' ? [
    { to: '/kitchen', label: 'Cocina' },
    { to: '/pending-bills', label: 'Cuentas' }
  ] : [
    user.role === 'mesero' && { to: '/waiter', label: 'Mesero' },
    user.role === 'mesero' && { to: '/pending-bills', label: 'Cuentas' },
    user.role === 'cocina' && { to: '/kitchen', label: 'Cocina' },
    (user.role === 'mesero' || user.role === 'cocina') && { to: '/tv', label: 'TV' },
    (user.role === 'mesero' || user.role === 'cocina') && { to: '/menu-board', label: 'Cartelera' },
    (user.role === 'mesero' || user.role === 'cocina') && { to: '/disponibilidad', label: 'Disponibilidad' }
  ].filter(Boolean);

  return (
    <nav className="bg-ink-900 text-cream-50 sticky top-0 z-50 shadow-lg shadow-ink-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <span className="font-display text-xl font-extrabold uppercase tracking-wider text-brand-500 shrink-0">
            La Gaonerita <span className="text-cream-100/60 text-sm normal-case tracking-normal">· Personal</span>
          </span>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            {links.map(l => <Link key={l.to} to={l.to} className={LINK_CLS}>{l.label}</Link>)}
            <span className="text-xs uppercase tracking-widest text-ink-300">{user.name}</span>
            <button onClick={handleLogout} className="text-xs font-semibold uppercase tracking-widest border border-cream-100/30 px-3 py-1.5 rounded hover:bg-cream-100/10 transition">Salir</button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setOpen(o => !o)} aria-label="Abrir menú" aria-expanded={open} className="md:hidden w-11 h-11 flex items-center justify-center shrink-0 -mr-2">
            <span className="relative w-6 h-4 block">
              <span className={`absolute left-0 top-0 w-6 h-0.5 bg-cream-50 transition ${open ? 'rotate-45 top-[7px]' : ''}`} />
              <span className={`absolute left-0 top-[7px] w-6 h-0.5 bg-cream-50 transition ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 bottom-0 w-6 h-0.5 bg-cream-50 transition ${open ? '-rotate-45 bottom-[7px]' : ''}`} />
            </span>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-cream-100/10 pt-2">
            {links.map(l => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={MOBILE_LINK_CLS}>{l.label}</Link>)}
            <div className="text-xs uppercase tracking-widest text-ink-300 py-2.5">{user.name}</div>
            <button onClick={handleLogout} className="mt-1 w-full text-center text-xs font-semibold uppercase tracking-widest border border-cream-100/30 px-3 py-2.5 rounded hover:bg-cream-100/10 transition">Salir</button>
          </div>
        )}
      </div>
      <div className="serape-line" aria-hidden="true" />
    </nav>
  );
}
