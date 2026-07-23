import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  const linkCls = "text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition";
  const mobileLinkCls = "block py-2.5 text-sm font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition";

  return (
    <nav className="bg-ink-900 text-cream-50 sticky top-0 z-50 shadow-lg shadow-ink-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" onClick={() => setOpen(false)} className="font-display text-xl font-extrabold uppercase tracking-wider text-brand-500 shrink-0">
            La Gaonerita
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            <Link to="/menu" className={linkCls}>Menú</Link>
            <Link to="/jobs" className={linkCls}>Trabajo</Link>
            {user ? (
              <>
                {user.role === 'cliente' && <Link to="/dashboard" className={linkCls}>Inicio</Link>}
                <Link to="/history" className={linkCls}>Historial</Link>
                <span className="text-xs uppercase tracking-widest text-ink-300">{user.name}</span>
                <button onClick={handleLogout} className="text-xs font-semibold uppercase tracking-widest border border-cream-100/30 px-3 py-1.5 rounded hover:bg-cream-100/10 transition">Salir</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-xs font-bold uppercase tracking-widest border border-cream-100/30 px-4 py-2 rounded hover:bg-cream-100/10 transition">Iniciar Sesión</Link>
                <Link to="/join" className="bg-brand-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded hover:bg-brand-600 transition">Registrarse</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setOpen(o => !o)} aria-label="Abrir menú" aria-expanded={open} className="md:hidden w-10 h-10 flex items-center justify-center shrink-0">
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
            <Link to="/menu" onClick={() => setOpen(false)} className={mobileLinkCls}>Menú</Link>
            <Link to="/jobs" onClick={() => setOpen(false)} className={mobileLinkCls}>Trabajo</Link>
            {user ? (
              <>
                {user.role === 'cliente' && <Link to="/dashboard" onClick={() => setOpen(false)} className={mobileLinkCls}>Inicio</Link>}
                <Link to="/history" onClick={() => setOpen(false)} className={mobileLinkCls}>Historial</Link>
                <div className="text-xs uppercase tracking-widest text-ink-300 py-2.5">{user.name}</div>
                <button onClick={handleLogout} className="mt-1 w-full text-center text-xs font-semibold uppercase tracking-widest border border-cream-100/30 px-3 py-2.5 rounded hover:bg-cream-100/10 transition">Salir</button>
              </>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Link to="/login" onClick={() => setOpen(false)} className="text-center text-xs font-bold uppercase tracking-widest border border-cream-100/30 px-4 py-2.5 rounded hover:bg-cream-100/10 transition">Iniciar Sesión</Link>
                <Link to="/join" onClick={() => setOpen(false)} className="text-center bg-brand-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded hover:bg-brand-600 transition">Registrarse</Link>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="serape-line" aria-hidden="true" />
    </nav>
  );
}
