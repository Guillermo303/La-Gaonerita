import { useState } from 'react';
import { reservations as reservationsApi } from '../api';

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

export default function ReservationModal({ onClose }) {
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', party_size: 2, date: todayStr(), time: '', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.customer_name || !form.customer_phone || !form.date || !form.time) {
      setError('Completa nombre, teléfono, fecha y hora');
      return;
    }
    setLoading(true);
    try {
      const res = await reservationsApi.create({ ...form, party_size: Number(form.party_size) });
      setSuccess(res.mesa);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-cream-50 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-cream-50 z-10 border-b border-ink-200 px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Reservar Mesa 🍽️</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl">✕</button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-ink-900 font-bold mb-1">¡Reservación confirmada!</p>
              <p className="text-ink-500 text-sm mb-4">
                Te esperamos el {form.date} a las {form.time} en <span className="font-bold text-brand-600">{success}</span>.
              </p>
              <p className="text-xs text-ink-400 mb-5">Tu mesa se marcará automáticamente como reservada una hora antes de tu llegada.</p>
              <button onClick={onClose} className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition">Cerrar</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1 block">Nombre</label>
                <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Tu nombre" className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1 block">Teléfono</label>
                <input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                  placeholder="10 dígitos" className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1 block">Fecha</label>
                  <input type="date" min={todayStr()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" required />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1 block">Hora</label>
                  <input type="time" min="12:00" max="22:00" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                    className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" required />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1 block">Número de personas</label>
                <input type="number" min="1" max="20" value={form.party_size} onChange={e => setForm({ ...form, party_size: e.target.value })}
                  className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-ink-500 mb-1 block">Notas (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Ej. celebración de cumpleaños, silla para bebé..." className="w-full p-3 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white resize-none" />
              </div>

              <p className="text-xs text-ink-400">Horario de reservaciones: 12:00 a 22:00 hrs.</p>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-700 transition disabled:opacity-40">
                {loading ? 'Reservando…' : 'Confirmar Reservación'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
