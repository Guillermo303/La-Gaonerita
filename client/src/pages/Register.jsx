import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleMeta = {
  cliente: { label: 'Cliente', redirect: '/dashboard', subtitle: 'Ordena tus tacos favoritos' },
  mesero: { label: 'Empleado', redirect: '/waiter', subtitle: 'Accede a la herramienta de mesero' }
};

export default function Register() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') === 'mesero' ? 'mesero' : 'cliente';
  const meta = roleMeta[role];
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register({ ...form, role });
      navigate(meta.redirect);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/join" className="text-2xl">🌮</Link>
          <h1 className="font-display text-3xl font-extrabold text-ink-900 mt-3">Crear Cuenta</h1>
          <p className="text-ink-400 mt-1">{meta.subtitle}</p>
          <div className="inline-block mt-3 bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">{meta.label}</div>
        </div>
        {error && <div className="bg-brand-50 border border-brand-200 text-brand-700 p-3 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white p-7 rounded-2xl shadow-md space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Nombre</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Teléfono</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Contraseña</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required minLength={6} />
          </div>
          <button type="submit" className="w-full bg-brand-500 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">
            Crear Cuenta {role === 'mesero' ? 'de Empleado' : ''}
          </button>
          <div className="flex justify-between text-sm text-ink-400">
            <Link to="/join" className="text-brand-600 hover:underline">← Elegir otro rol</Link>
            <span>¿Ya tienes? <Link to="/login" className="text-brand-600 font-semibold hover:underline">Entrar</Link></span>
          </div>
        </form>
      </div>
    </div>
  );
}
