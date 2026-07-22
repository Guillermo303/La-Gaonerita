import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-ink-900 text-cream-50 sticky top-0 z-50 shadow-lg shadow-ink-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl font-extrabold uppercase tracking-wider text-brand-500">
            La Gaonerita
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/menu" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Menú</Link>
            <Link to="/jobs" className="hidden sm:inline text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Trabajo</Link>
            {user ? (
              <>
                {user.role === 'cliente' && <Link to="/dashboard" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Inicio</Link>}
                <Link to="/history" className="text-xs font-semibold uppercase tracking-widest text-cream-100/80 hover:text-white transition">Historial</Link>
                <span className="hidden sm:inline text-xs uppercase tracking-widest text-ink-300">{user.name}</span>
                <button onClick={handleLogout} className="text-xs font-semibold uppercase tracking-widest border border-cream-100/30 px-3 py-1.5 rounded hover:bg-cream-100/10 transition">Salir</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-xs font-bold uppercase tracking-widest border border-cream-100/30 px-4 py-2 rounded hover:bg-cream-100/10 transition">Iniciar Sesión</Link>
                <Link to="/join" className="bg-brand-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded hover:bg-brand-600 transition">Registrarse</Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="serape-line" aria-hidden="true" />
    </nav>
  );
}
