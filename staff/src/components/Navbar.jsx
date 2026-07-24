import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-ink-900 text-cream-50 sticky top-0 z-50 shadow-lg shadow-ink-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <span className="font-display text-xl font-extrabold uppercase tracking-wider text-brand-500">
            La Gaonerita <span className="text-cream-100/60 text-sm normal-case tracking-normal">· Personal</span>
          </span>
          <div className="flex items-center gap-5">
            {(user.role === 'admin' || user.role === 'mesero') && <Link to="/waiter" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Mesero</Link>}
            {(user.role === 'admin' || user.role === 'mesero') && <Link to="/pending-bills" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Cuentas</Link>}
            {(user.role === 'admin' || user.role === 'cocina') && <Link to="/kitchen" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Cocina</Link>}
            {(user.role === 'admin' || user.role === 'mesero' || user.role === 'cocina') && <Link to="/tv" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">TV</Link>}
            {(user.role === 'admin' || user.role === 'mesero' || user.role === 'cocina') && <Link to="/disponibilidad" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Disponibilidad</Link>}
            {user.role === 'admin' && <Link to="/admin" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Admin</Link>}
            <span className="hidden sm:inline text-xs uppercase tracking-widest text-ink-300">{user.name}</span>
            <button onClick={handleLogout} className="text-xs font-semibold uppercase tracking-widest border border-cream-100/30 px-3 py-1.5 rounded hover:bg-cream-100/10 transition">Salir</button>
          </div>
        </div>
      </div>
      <div className="serape-line" aria-hidden="true" />
    </nav>
  );
}
