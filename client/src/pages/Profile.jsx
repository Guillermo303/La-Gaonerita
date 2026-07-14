import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const res = await authApi.updateProfile({ name: form.name, phone: form.phone || null });
      localStorage.setItem('token', res.token);
      setUser(res.user);
      setMsg('Perfil actualizado');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pw.new !== pw.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (pw.new.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const res = await authApi.updateProfile({ current_password: pw.current, new_password: pw.new });
      localStorage.setItem('token', res.token);
      setUser(res.user);
      setPw({ current: '', new: '', confirm: '' });
      setMsg('Contraseña actualizada');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-3xl font-black font-display text-ink-900 mb-8">Mi Perfil</h1>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl mb-4 text-sm">{msg}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-md border border-ink-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-ink-100">
          <div className="w-14 h-14 rounded-full bg-brand-500 text-white flex items-center justify-center text-2xl font-bold">{user.name?.charAt(0) || '?'}</div>
          <div>
            <div className="font-bold text-ink-900">{user.name}</div>
            <div className="text-sm text-ink-400">{user.email}</div>
            <div className="text-xs text-brand-600 font-semibold mt-0.5 uppercase tracking-wider">{user.role}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Nombre</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Teléfono</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="55 1234 5678" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-brand-500 text-white py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-brand-600 transition disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-ink-100 p-6">
        <h2 className="text-lg font-bold text-ink-900 mb-4">Cambiar Contraseña</h2>
        <form onSubmit={handleChangePw} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Contraseña actual</label>
            <input type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Nueva contraseña</label>
            <input type="password" value={pw.new} onChange={e => setPw({ ...pw, new: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1">Confirmar nueva contraseña</label>
            <input type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" required />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-ink-900 text-white py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-ink-800 transition disabled:opacity-50">
            {saving ? 'Actualizando…' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
