import { useState, useEffect, useRef } from 'react';
import { orders as ordersApi } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { formatPrice, statusLabels, typeLabels } from '../../lib/utils';
import { requestNotifyPermission, notify } from '../../lib/notifications';
import { printTicket } from '../../lib/print';
import { notifyOrderReady } from '../../lib/whatsapp';

function ElapsedTimer({ created, status }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(created + 'Z').getTime());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(created + 'Z').getTime()), 1000);
    return () => clearInterval(id);
  }, [created]);

  const totalSec = Math.floor(elapsed / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}:${String(secs).padStart(2, '0')}`;

  const color = mins >= 10 ? 'text-red-500' : mins >= 5 ? 'text-yellow-500' : 'text-green-500';
  const urgent = mins >= 8 && status !== 'listo';

  return (
    <span className={`font-mono text-lg font-bold ${color} ${urgent ? 'animate-pulse' : ''}`}>
      {urgent ? '⚠️ ' : ''}{display}
    </span>
  );
}

function BigButton({ orders, onAdvance }) {
  const [flashing, setFlashing] = useState(false);

  const nextPendiente = orders.filter(o => o.status === 'pendiente').sort((a, b) => new Date(a.created_at + 'Z') - new Date(b.created_at + 'Z'))[0];
  const nextPreparando = orders.filter(o => o.status === 'preparando').sort((a, b) => new Date(a.created_at + 'Z') - new Date(b.created_at + 'Z'))[0];

  const target = nextPendiente || nextPreparando;
  if (!target) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-ink-400">
        <div className="text-8xl mb-6">🍃</div>
        <p className="text-2xl font-semibold">No hay órdenes pendientes</p>
      </div>
    </div>
  );

  const isPendiente = target.status === 'pendiente';
  const nextStatus = isPendiente ? 'preparando' : 'listo';
  const label = isPendiente ? 'Preparar' : 'Listo';
  const color = isPendiente ? 'bg-blue-500' : 'bg-green-500';
  const hoverColor = isPendiente ? 'bg-blue-600' : 'bg-green-600';
  const icon = isPendiente ? '👨‍🍳' : '✅';

  const handlePress = () => {
    setFlashing(true);
    onAdvance(target.id, nextStatus);
    setTimeout(() => setFlashing(false), 300);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 select-none">
      <div className="text-center">
        <div className="text-xl text-ink-400 font-semibold mb-1">
          {isPendiente ? 'Siguiente orden pendiente' : 'Siguiente en preparación'}
        </div>
        <div className="text-5xl font-black text-ink-900">#{target.id}</div>
        <div className="text-lg text-ink-500 mt-1">{target.customer_name} · {target.order_type === 'domicilio' ? '🛵 Domicilio' : '🏠 Local'}</div>
        <ElapsedTimer created={target.created_at} status={target.status} />
      </div>
      <button onClick={handlePress}
        className={`w-72 h-72 rounded-full ${color} text-white text-4xl font-black uppercase tracking-wider shadow-2xl hover:${hoverColor} active:scale-95 transition-all duration-100 flex flex-col items-center justify-center gap-3 ${flashing ? 'ring-8 ring-white scale-95' : ''}`}>
        <span className="text-7xl">{icon}</span>
        <span>{label}</span>
      </button>
      <div className="text-sm text-ink-400">
        {target.items?.slice(0, 3).map(item => `${item.quantity}x ${item.name}`).join(' · ')}
        {target.items?.length > 3 && ' · · ·'}
      </div>
    </div>
  );
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [bigMode, setBigMode] = useState(false);
  const socket = useSocket();
  const audioRef = useRef(null);

  const playNotification = () => {
    try {
      if (audioRef.current) audioRef.current.play();
    } catch {}
  };

  useEffect(() => {
    requestNotifyPermission();
    ordersApi.getKitchen().then(setOrders).catch(console.error);
    if (socket) {
      socket.emit('join:kitchen');
      socket.on('order:update', (order) => {
        if (['pendiente', 'preparando', 'listo'].includes(order.status)) {
          setOrders(prev => {
            const idx = prev.findIndex(o => o.id === order.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = order;
              return updated;
            }
            playNotification();
            notify(`Nueva orden #${order.id}`, {
              body: `${order.customer_name} - $${order.total}${order.notes ? ` (${order.notes})` : ''}`
            });
            return [...prev, order];
          });
        } else {
          setOrders(prev => prev.filter(o => o.id !== order.id));
        }
      });
    }
    return () => { if (socket) socket.off('order:update'); };
  }, [socket]);

  const updateStatus = (id, status) => ordersApi.updateStatus(id, status).catch(console.error);

  const pendingOrders = orders.filter(o => o.status === 'pendiente');
  const preparingOrders = orders.filter(o => o.status === 'preparando');
  const readyOrders = orders.filter(o => o.status === 'listo');

  const OrderCard = ({ order, compact }) => (
    <div className={`bg-white rounded-xl shadow-lg p-4 border-l-4 ${order.order_type === 'domicilio' ? 'border-l-blue-500' : 'border-l-green-500'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">#{order.id}</span>
          <ElapsedTimer created={order.created_at} status={order.status} />
          <span className={`ml-1 text-lg font-semibold ${order.order_type === 'domicilio' ? 'text-blue-600' : 'text-green-600'}`}>{typeLabels[order.order_type]}</span>
        </div>
        <span className="text-lg font-bold">{formatPrice(order.total)}</span>
      </div>
      <div className="text-lg font-medium mb-1">{order.customer_name}</div>
      {order.order_type === 'domicilio' && order.customer_address && (
        <div className="text-sm text-gray-500 mb-2">{order.customer_address}</div>
      )}
      <div className="space-y-1 mb-3">
        {order.items?.map(item => (
          <div key={item.id}>
            <div className="flex justify-between text-lg">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
            </div>
            {item.notes && <div className="text-xs text-yellow-600 ml-2">📝 {item.notes}</div>}
          </div>
        ))}
      </div>
      {order.notes && <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded mb-2">📝 {order.notes}</div>}
      {!compact && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => printTicket({ type: 'comanda', order, items: order.items || [] })} className="bg-ink-100 text-ink-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-ink-200">🖨️ Imprimir</button>
          {order.status === 'listo' && order.customer_phone && (
            <a href={notifyOrderReady(order)} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-200">📱 WhatsApp</a>
          )}
          {order.status === 'pendiente' && <button onClick={() => updateStatus(order.id, 'preparando')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-lg font-semibold hover:bg-blue-600">Preparar</button>}
          {order.status === 'preparando' && <button onClick={() => updateStatus(order.id, 'listo')} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-lg font-semibold hover:bg-green-600">Listo</button>}
          {order.status === 'pendiente' && <button onClick={() => updateStatus(order.id, 'cancelado')} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">Cancelar</button>}
        </div>
      )}
    </div>
  );

  const handleAdvance = (id, status) => updateStatus(id, status);

  if (bigMode) {
    return (
      <div className="min-h-screen bg-cream-50 p-8">
        <button onClick={() => setBigMode(false)} className="fixed top-4 right-4 z-10 bg-ink-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-ink-800 transition">Salir Modo Botón</button>
        <BigButton orders={orders} onAdvance={handleAdvance} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+Af39/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+Af39/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f38=" preload="auto"></audio>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">👨‍🍳 Cocina - La Gaonerita</h1>
        <button onClick={() => setBigMode(true)} className="bg-ink-900 text-white px-5 py-3 rounded-xl text-lg font-bold hover:bg-ink-800 transition shadow-lg flex items-center gap-2">
          <span className="text-2xl">🔘</span> Botón Físico
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h2 className="text-xl font-bold text-yellow-700 bg-yellow-100 p-3 rounded-t-lg text-center">Pendientes ({pendingOrders.length})</h2>
          <div className="space-y-3 mt-3">
            {pendingOrders.map(order => <OrderCard key={order.id} order={order} compact={false} />)}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-blue-700 bg-blue-100 p-3 rounded-t-lg text-center">Preparando ({preparingOrders.length})</h2>
          <div className="space-y-3 mt-3">
            {preparingOrders.map(order => <OrderCard key={order.id} order={order} compact={false} />)}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-green-700 bg-green-100 p-3 rounded-t-lg text-center">Listos ({readyOrders.length})</h2>
          <div className="space-y-3 mt-3">
            {readyOrders.map(order => <OrderCard key={order.id} order={order} compact={true} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
