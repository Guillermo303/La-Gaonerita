import { useState } from 'react';
import StyledImage from './StyledImage';

const SHAPES = [
  { value: 'rounded', label: 'Redondeado' },
  { value: 'circle', label: 'Círculo' },
  { value: 'square', label: 'Cuadrado' }
];

export default function ImageEditorModal({ initial, onSave, onClose }) {
  const [image, setImage] = useState(initial.image || '');
  const [shape, setShape] = useState(initial.image_shape || 'rounded');
  const [zoom, setZoom] = useState(initial.image_zoom || 1);
  const [posX, setPosX] = useState(initial.image_pos_x ?? 50);
  const [posY, setPosY] = useState(initial.image_pos_y ?? 50);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ image: image.trim() || null, image_shape: shape, image_zoom: zoom, image_pos_x: posX, image_pos_y: posY });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-ink-900 mb-4">Imagen</h3>
        <input
          value={image}
          onChange={e => setImage(e.target.value)}
          placeholder="URL de la imagen"
          className="w-full border border-ink-200 rounded-lg p-2 text-sm mb-4"
          autoFocus
        />
        {image && (
          <>
            <StyledImage src={image} shape={shape} zoom={zoom} posX={posX} posY={posY} className="w-32 h-32 mx-auto bg-cream-100 mb-4" />

            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1.5">Forma</label>
            <div className="flex gap-2 mb-4">
              {SHAPES.map(s => (
                <button key={s.value} type="button" onClick={() => setShape(s.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${shape === s.value ? 'bg-brand-500 text-white border-brand-500' : 'border-ink-200 text-ink-500 hover:border-ink-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1.5">Zoom</label>
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full mb-4" />

            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1.5">Posición horizontal</label>
            <input type="range" min="0" max="100" value={posX} onChange={e => setPosX(Number(e.target.value))} className="w-full mb-4" />

            <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-1.5">Posición vertical</label>
            <input type="range" min="0" max="100" value={posY} onChange={e => setPosY(Number(e.target.value))} className="w-full mb-4" />
          </>
        )}
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-bold border border-ink-200 text-ink-600 hover:bg-cream-50">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
