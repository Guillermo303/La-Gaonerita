import { useState, useEffect } from 'react';
import { settings as settingsApi } from '../api';

const FIELDS = [
  { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: '5512345678' },
  { key: 'whatsapp', label: 'WhatsApp (código país + número)', type: 'tel', placeholder: '525512345678' },
  { key: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'contacto@laganerita.com' },
  { key: 'address', label: 'Dirección', type: 'text', placeholder: 'Av. Principal 123, Col. Centro' },
  { key: 'facebook', label: 'Facebook URL', type: 'url', placeholder: 'https://facebook.com/laganerita' },
  { key: 'instagram', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/laganerita' },
  { key: 'tiktok', label: 'TikTok URL', type: 'url', placeholder: 'https://tiktok.com/@laganerita' },
  { key: 'business_hours', label: 'Horario', type: 'text', placeholder: 'Lun-Sáb: 10:00-22:00, Dom: 11:00-21:00' },
];

export default function ComunicacionesAdmin() {
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { settingsApi.get().then(setData).catch(console.error); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-black font-display text-lg">📡 Comunicaciones</h2>
        <button onClick={save} disabled={saving}
          className="bg-brand-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-brand-600 transition disabled:opacity-50">
          {saving ? 'Guardando…' : saved ? '✅ Guardado' : 'Guardar'}
        </button>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-ink-100 space-y-5">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1.5">{f.label}</label>
            <input type={f.type} value={data[f.key] || ''} onChange={e => setData({ ...data, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full p-2.5 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        ))}
        <div className="text-xs text-ink-400 bg-cream-50 rounded-xl p-3">
          💡 Estos datos se mostrarán en el Footer, botón de WhatsApp flotante y páginas públicas del sitio.
          Actualiza los valores y presiona "Guardar".
        </div>
      </div>
    </div>
  );
}
