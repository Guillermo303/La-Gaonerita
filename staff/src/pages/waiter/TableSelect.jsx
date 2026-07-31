import { useState, useEffect } from 'react';
import { mesas as mesasApi } from '../../api';
import { useSocket } from '../../context/SocketContext';
import MesaPanel from '../../components/MesaPanel';
import QuickSaleModal from '../../components/QuickSaleModal';
import CobroModal from '../../components/CobroModal';

const mesaStyles = {
  libre: { bg: 'bg-white', border: 'border-ink-200', text: 'text-ink-400', label: 'Libre', glyph: '○' },
  ocupada: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', label: 'Ocupada', glyph: '🟡' },
  'pendiente-pago': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', label: 'Cuenta', glyph: '💰' },
  reservada: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', label: 'Reservada', glyph: '📅' }
};

export default function TableSelect() {
  const [mesas, setMesas] = useState([]);
  const [mesaPanel, setMesaPanel] = useState(null);
  const [quickSale, setQuickSale] = useState(false);
  const [cobrando, setCobrando] = useState(null);
  const socket = useSocket();

  const load = () => mesasApi.getAll().then(setMesas).catch(console.error);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:update', load);
    socket.on('mesas:update', load);
    return () => { socket.off('order:update', load); socket.off('mesas:update', load); };
  }, [socket]);

  const ocupadas = mesas.filter(m => m.state === 'ocupada' || m.state === 'pendiente-pago').length;
  const paraCobrar = mesas.filter(m => m.state === 'pendiente-pago').length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Elige una mesa</h1>
          <p className="text-sm text-ink-400">Toca la mesa para abrir o tomar su pedido</p>
        </div>
        <div className="text-right text-xs text-ink-400 leading-5">
          <div>🟡 {ocupadas - paraCobrar} ocupadas</div>
          {paraCobrar > 0 && <div className="text-green-600 font-bold">💰 {paraCobrar} listas para cobrar</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {mesas.map(m => {
          const s = mesaStyles[m.state] || mesaStyles.libre;
          return (
            <button key={m.id} onClick={() => setMesaPanel(m)}
              className={`${s.bg} ${s.border} border-2 rounded-2xl p-5 sm:p-6 text-center transition hover:scale-[1.03] shadow-sm hover:shadow-md flex flex-col items-center justify-center gap-1 min-h-[8rem] sm:min-h-[9rem] cursor-pointer w-full ${m.state === 'pendiente-pago' ? 'animate-pulse shadow-lg' : ''}`}>
              <div className={`text-2xl font-black font-display uppercase ${s.text}`}>{m.name}</div>
              <div className={`text-sm font-bold ${s.text}`}>{s.glyph} {s.label}</div>
              {m.state !== 'libre' && m.lastCustomer && (
                <div className="text-sm text-ink-500 font-medium truncate max-w-full">{m.lastCustomer}</div>
              )}
              {m.state === 'pendiente-pago' && (
                <div className="text-sm text-green-600 font-bold">Cobrar</div>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={() => setQuickSale(true)} className="mt-4 w-full bg-ink-800 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-ink-900 transition shadow-sm flex items-center justify-center gap-2">
        ⚡ Venta Rápida
      </button>

      {mesaPanel && (
        <MesaPanel mesa={mesaPanel} onClose={() => setMesaPanel(null)} onUpdate={load} />
      )}
      {quickSale && (
        <QuickSaleModal onClose={() => setQuickSale(false)} onCreated={(order) => { setQuickSale(false); load(); setCobrando(order); }} />
      )}
      {cobrando && (
        <CobroModal order={cobrando} onClose={() => setCobrando(null)} onPaid={load} />
      )}
    </div>
  );
}
