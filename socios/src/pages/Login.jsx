import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      if (!['socio', 'admin'].includes(user.role)) {
        logout();
        setError('Esta cuenta no tiene acceso al panel de socios.');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-2xl">🌮</div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900 mt-3">La Gaonerita</h1>
          <p className="text-ink-400 mt-1">Panel de Socios</p>
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
        </form>
      </div>
    </div>
  );
}
