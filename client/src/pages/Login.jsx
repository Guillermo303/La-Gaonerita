import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('credenciales');
  const [user, setUser] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const u = await login(email, password);
      setUser(u);
      setStep('elegir');
    } catch (err) {
      setError(err.message);
    }
  };

  const irA = (path) => navigate(path);

  const esStaff = user && (user.role === 'admin' || user.role === 'cocina' || user.role === 'mesero');

  if (step === 'elegir') return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">🌮</div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-1">¡Bienvenido{user?.name ? `, ${user.name}` : ''}!</h1>
        <p className="text-ink-400 mb-8">¿Qué deseas hacer hoy?</p>

        <div className="space-y-4">
          <button onClick={() => irA('/dashboard')}
            className="w-full bg-brand-500 text-white p-6 rounded-2xl text-left hover:bg-brand-600 transition shadow-md flex items-center gap-4">
            <span className="text-4xl">🍽️</span>
            <div>
              <div className="font-black text-lg">Ordenar comida</div>
              <div className="text-sm text-white/80">Ver menú, hacer pedidos y consultar tu historial</div>
            </div>
          </button>

          {esStaff && (
            <button onClick={() => {
              if (user.role === 'cocina') irA('/kitchen');
              else if (user.role === 'mesero') irA('/waiter');
              else irA('/admin');
            }}
              className="w-full bg-ink-800 text-white p-6 rounded-2xl text-left hover:bg-ink-700 transition shadow-md flex items-center gap-4">
              <span className="text-4xl">👨‍💼</span>
              <div>
                <div className="font-black text-lg">Trabajar</div>
                <div className="text-sm text-white/80">
                  {user.role === 'cocina' ? 'Pantalla de cocina' :
                   user.role === 'mesero' ? 'Panel de mesero' :
                   'Panel de administración'}
                </div>
              </div>
            </button>
          )}

          <button onClick={() => { setStep('credenciales'); setUser(null); setPassword(''); }}
            className="w-full border border-ink-200 bg-white p-4 rounded-xl text-sm text-ink-500 hover:bg-ink-50 transition">
            ← Cambiar de cuenta
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/join" className="text-2xl">🌮</Link>
          <h1 className="font-display text-3xl font-extrabold text-ink-900 mt-3">Iniciar Sesión</h1>
          <p className="text-ink-400 mt-1">Bienvenido de vuelta</p>
        </div>
        {error && <div className="bg-brand-50 border border-brand-200 text-brand-700 p-3 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white p-7 rounded-2xl shadow-md space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <button type="submit" className="w-full bg-brand-500 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Entrar</button>
          <p className="text-center text-sm text-ink-400">
            ¿No tienes cuenta?{' '}
            <Link to="/join" className="text-brand-600 font-semibold hover:underline">Crear una</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
